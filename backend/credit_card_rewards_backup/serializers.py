from rest_framework import serializers
from .models import (
    RewardsCategory, RewardsPayee, PaymentMethod, PointsProgram,
    RewardRule, StaticRewardRule, RotatingRewardRule, DynamicRewardRule,
    DynamicRewardTier, ActivationRequirement, RewardRuleAssignment, RewardCalculation
)

class RewardsCategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = RewardsCategory
        fields = '__all__'

    def get_children(self, obj):
        children = RewardsCategory.objects.filter(parent=obj, is_active=True)
        return RewardsCategorySerializer(children, many=True).data

class RewardsPayeeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    default_category_name = serializers.CharField(source='default_category.name', read_only=True)

    class Meta:
        model = RewardsPayee
        fields = '__all__'

    def get_children(self, obj):
        children = RewardsPayee.objects.filter(parent=obj, is_active=True)
        return RewardsPayeeSerializer(children, many=True).data

class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = '__all__'

class PointsProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointsProgram
        fields = '__all__'

class DynamicRewardTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = DynamicRewardTier
        fields = '__all__'

class ActivationRequirementSerializer(serializers.ModelSerializer):
    categories = RewardsCategorySerializer(many=True, read_only=True)
    payees = RewardsPayeeSerializer(many=True, read_only=True)

    class Meta:
        model = ActivationRequirement
        fields = '__all__'

class StaticRewardRuleSerializer(serializers.ModelSerializer):
    categories = RewardsCategorySerializer(many=True, read_only=True)
    payees = RewardsPayeeSerializer(many=True, read_only=True)
    points_program_name = serializers.CharField(source='points_program.name', read_only=True)

    class Meta:
        model = StaticRewardRule
        fields = '__all__'

class RotatingRewardRuleSerializer(serializers.ModelSerializer):
    categories = RewardsCategorySerializer(many=True, read_only=True)
    payees = RewardsPayeeSerializer(many=True, read_only=True)
    points_program_name = serializers.CharField(source='points_program.name', read_only=True)

    class Meta:
        model = RotatingRewardRule
        fields = '__all__'

class DynamicRewardRuleSerializer(serializers.ModelSerializer):
    categories = RewardsCategorySerializer(many=True, read_only=True)
    payees = RewardsPayeeSerializer(many=True, read_only=True)
    points_program_name = serializers.CharField(source='points_program.name', read_only=True)
    tiers = DynamicRewardTierSerializer(many=True, read_only=True)

    class Meta:
        model = DynamicRewardRule
        fields = '__all__'

class RewardRuleSerializer(serializers.ModelSerializer):
    static_rule = StaticRewardRuleSerializer(read_only=True)
    rotating_rule = RotatingRewardRuleSerializer(read_only=True)
    dynamic_rule = DynamicRewardRuleSerializer(read_only=True)
    activation_requirements = ActivationRequirementSerializer(many=True, read_only=True)
    assignments_count = serializers.SerializerMethodField()

    class Meta:
        model = RewardRule
        fields = '__all__'

    def get_assignments_count(self, obj):
        return obj.assignments.filter(is_active=True).count()

class RewardRuleAssignmentSerializer(serializers.ModelSerializer):
    reward_rule_name = serializers.CharField(source='reward_rule.name', read_only=True)
    reward_rule_type = serializers.CharField(source='reward_rule.rule_type', read_only=True)

    class Meta:
        model = RewardRuleAssignment
        fields = '__all__'

class RewardCalculationSerializer(serializers.ModelSerializer):
    reward_rule_name = serializers.CharField(source='reward_rule.name', read_only=True)
    points_program_name = serializers.CharField(source='points_program.name', read_only=True)

    class Meta:
        model = RewardCalculation
        fields = '__all__'

# Nested serializers for creating/updating reward rules
class RewardRuleCreateSerializer(serializers.ModelSerializer):
    static_rule_data = StaticRewardRuleSerializer(write_only=True, required=False)
    rotating_rule_data = RotatingRewardRuleSerializer(write_only=True, required=False)
    dynamic_rule_data = DynamicRewardRuleSerializer(write_only=True, required=False)
    activation_requirements_data = ActivationRequirementSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = RewardRule
        fields = '__all__'

    def create(self, validated_data):
        static_rule_data = validated_data.pop('static_rule_data', None)
        rotating_rule_data = validated_data.pop('rotating_rule_data', None)
        dynamic_rule_data = validated_data.pop('dynamic_rule_data', None)
        activation_requirements_data = validated_data.pop('activation_requirements_data', [])

        # Create the base reward rule
        reward_rule = RewardRule.objects.create(**validated_data)

        # Create the specific rule type
        if static_rule_data:
            StaticRewardRule.objects.create(reward_rule=reward_rule, **static_rule_data)
        elif rotating_rule_data:
            RotatingRewardRule.objects.create(reward_rule=reward_rule, **rotating_rule_data)
        elif dynamic_rule_data:
            DynamicRewardRule.objects.create(reward_rule=reward_rule, **dynamic_rule_data)

        # Create activation requirements
        for req_data in activation_requirements_data:
            ActivationRequirement.objects.create(reward_rule=reward_rule, **req_data)

        return reward_rule

    def update(self, instance, validated_data):
        static_rule_data = validated_data.pop('static_rule_data', None)
        rotating_rule_data = validated_data.pop('rotating_rule_data', None)
        dynamic_rule_data = validated_data.pop('dynamic_rule_data', None)
        activation_requirements_data = validated_data.pop('activation_requirements_data', [])

        # Update the base reward rule
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update the specific rule type
        if static_rule_data:
            if hasattr(instance, 'static_rule'):
                for attr, value in static_rule_data.items():
                    setattr(instance.static_rule, attr, value)
                instance.static_rule.save()
            else:
                StaticRewardRule.objects.create(reward_rule=instance, **static_rule_data)
        elif rotating_rule_data:
            if hasattr(instance, 'rotating_rule'):
                for attr, value in rotating_rule_data.items():
                    setattr(instance.rotating_rule, attr, value)
                instance.rotating_rule.save()
            else:
                RotatingRewardRule.objects.create(reward_rule=instance, **rotating_rule_data)
        elif dynamic_rule_data:
            if hasattr(instance, 'dynamic_rule'):
                for attr, value in dynamic_rule_data.items():
                    setattr(instance.dynamic_rule, attr, value)
                instance.dynamic_rule.save()
            else:
                DynamicRewardRule.objects.create(reward_rule=instance, **dynamic_rule_data)

        # Update activation requirements
        if activation_requirements_data:
            # Remove existing requirements
            instance.activation_requirements.all().delete()
            # Create new requirements
            for req_data in activation_requirements_data:
                ActivationRequirement.objects.create(reward_rule=instance, **req_data)

        return instance