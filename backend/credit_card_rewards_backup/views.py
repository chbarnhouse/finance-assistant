from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Sum, Count
from django.utils import timezone
from datetime import date
from .models import (
    RewardsCategory, RewardsPayee, PaymentMethod, PointsProgram,
    RewardRule, StaticRewardRule, RotatingRewardRule, DynamicRewardRule,
    DynamicRewardTier, ActivationRequirement, RewardRuleAssignment, RewardCalculation
)
from .serializers import (
    RewardsCategorySerializer, RewardsPayeeSerializer, PaymentMethodSerializer, PointsProgramSerializer,
    RewardRuleSerializer, StaticRewardRuleSerializer, RotatingRewardRuleSerializer, DynamicRewardRuleSerializer,
    DynamicRewardTierSerializer, ActivationRequirementSerializer, RewardRuleAssignmentSerializer,
    RewardCalculationSerializer, RewardRuleCreateSerializer
)

class RewardsCategoryViewSet(viewsets.ModelViewSet):
    queryset = RewardsCategory.objects.filter(is_active=True)
    serializer_class = RewardsCategorySerializer

    def get_queryset(self):
        queryset = RewardsCategory.objects.filter(is_active=True)
        parent_id = self.request.query_params.get('parent', None)
        if parent_id:
            if parent_id == 'null':
                queryset = queryset.filter(parent__isnull=True)
            else:
                queryset = queryset.filter(parent_id=parent_id)
        return queryset

class RewardsPayeeViewSet(viewsets.ModelViewSet):
    queryset = RewardsPayee.objects.filter(is_active=True)
    serializer_class = RewardsPayeeSerializer

    def get_queryset(self):
        queryset = RewardsPayee.objects.filter(is_active=True)
        parent_id = self.request.query_params.get('parent', None)
        if parent_id:
            if parent_id == 'null':
                queryset = queryset.filter(parent__isnull=True)
            else:
                queryset = queryset.filter(parent_id=parent_id)
        return queryset

class PaymentMethodViewSet(viewsets.ModelViewSet):
    queryset = PaymentMethod.objects.filter(is_active=True)
    serializer_class = PaymentMethodSerializer

class PointsProgramViewSet(viewsets.ModelViewSet):
    queryset = PointsProgram.objects.filter(is_active=True)
    serializer_class = PointsProgramSerializer

class StaticRewardRuleViewSet(viewsets.ModelViewSet):
    queryset = StaticRewardRule.objects.all()
    serializer_class = StaticRewardRuleSerializer

class RotatingRewardRuleViewSet(viewsets.ModelViewSet):
    queryset = RotatingRewardRule.objects.all()
    serializer_class = RotatingRewardRuleSerializer

class DynamicRewardRuleViewSet(viewsets.ModelViewSet):
    queryset = DynamicRewardRule.objects.all()
    serializer_class = DynamicRewardRuleSerializer

class DynamicRewardTierViewSet(viewsets.ModelViewSet):
    queryset = DynamicRewardTier.objects.all()
    serializer_class = DynamicRewardTierSerializer

    def get_queryset(self):
        queryset = DynamicRewardTier.objects.all()
        dynamic_rule_id = self.request.query_params.get('dynamic_rule', None)
        if dynamic_rule_id:
            queryset = queryset.filter(dynamic_rule_id=dynamic_rule_id)
        return queryset

class ActivationRequirementViewSet(viewsets.ModelViewSet):
    queryset = ActivationRequirement.objects.filter(is_active=True)
    serializer_class = ActivationRequirementSerializer

    def get_queryset(self):
        queryset = ActivationRequirement.objects.filter(is_active=True)
        reward_rule_id = self.request.query_params.get('reward_rule', None)
        if reward_rule_id:
            queryset = queryset.filter(reward_rule_id=reward_rule_id)
        return queryset

class RewardRuleViewSet(viewsets.ModelViewSet):
    queryset = RewardRule.objects.filter(is_active=True)
    serializer_class = RewardRuleSerializer

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return RewardRuleCreateSerializer
        return RewardRuleSerializer

    def get_queryset(self):
        queryset = RewardRule.objects.filter(is_active=True)
        rule_type = self.request.query_params.get('rule_type', None)
        if rule_type:
            queryset = queryset.filter(rule_type=rule_type)
        return queryset

    @action(detail=True, methods=['post'])
    def assign_to_card(self, request, pk=None):
        """Assign a reward rule to a credit card"""
        reward_rule = self.get_object()
        credit_card_id = request.data.get('credit_card_id')

        if not credit_card_id:
            return Response(
                {'error': 'credit_card_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        assignment, created = RewardRuleAssignment.objects.get_or_create(
            reward_rule=reward_rule,
            credit_card_id=credit_card_id,
            defaults={'is_active': True}
        )

        if not created:
            assignment.is_active = True
            assignment.save()

        return Response({
            'message': f'Reward rule assigned to card {credit_card_id}',
            'assignment_id': assignment.id
        })

    @action(detail=True, methods=['post'])
    def unassign_from_card(self, request, pk=None):
        """Unassign a reward rule from a credit card"""
        reward_rule = self.get_object()
        credit_card_id = request.data.get('credit_card_id')

        if not credit_card_id:
            return Response(
                {'error': 'credit_card_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            assignment = RewardRuleAssignment.objects.get(
                reward_rule=reward_rule,
                credit_card_id=credit_card_id
            )
            assignment.is_active = False
            assignment.save()
            return Response({'message': f'Reward rule unassigned from card {credit_card_id}'})
        except RewardRuleAssignment.DoesNotExist:
            return Response(
                {'error': 'Assignment not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def by_card(self, request):
        """Get all reward rules assigned to a specific credit card"""
        credit_card_id = request.query_params.get('credit_card_id')
        if not credit_card_id:
            return Response(
                {'error': 'credit_card_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        assignments = RewardRuleAssignment.objects.filter(
            credit_card_id=credit_card_id,
            is_active=True
        ).select_related('reward_rule')

        reward_rules = [assignment.reward_rule for assignment in assignments]
        serializer = self.get_serializer(reward_rules, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def calculate_rewards(self, request):
        """Calculate rewards for a transaction"""
        transaction_id = request.data.get('transaction_id')
        credit_card_id = request.data.get('credit_card_id')
        amount = request.data.get('amount')
        category_id = request.data.get('category_id')
        payee_id = request.data.get('payee_id')

        if not all([transaction_id, credit_card_id, amount]):
            return Response(
                {'error': 'transaction_id, credit_card_id, and amount are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get all active reward rules assigned to this card
        assignments = RewardRuleAssignment.objects.filter(
            credit_card_id=credit_card_id,
            is_active=True
        ).select_related('reward_rule')

        calculations = []

        for assignment in assignments:
            reward_rule = assignment.reward_rule

            # Check if rule applies to this transaction
            if self._rule_applies_to_transaction(reward_rule, amount, category_id, payee_id):
                calculation = self._calculate_reward(reward_rule, amount)
                if calculation:
                    # Save calculation to database
                    calc_obj = RewardCalculation.objects.create(
                        transaction_id=transaction_id,
                        reward_rule=reward_rule,
                        credit_card_id=credit_card_id,
                        transaction_amount=amount,
                        reward_percentage=calculation['percentage'],
                        reward_amount=calculation['reward_amount'],
                        points_earned=calculation.get('points_earned'),
                        points_program=calculation.get('points_program')
                    )

                    calculations.append({
                        'reward_rule_name': reward_rule.name,
                        'reward_rule_type': reward_rule.rule_type,
                        'percentage': calculation['percentage'],
                        'reward_amount': calculation['reward_amount'],
                        'points_earned': calculation.get('points_earned'),
                        'points_program': calculation.get('points_program_name')
                    })

        return Response({
            'transaction_id': transaction_id,
            'credit_card_id': credit_card_id,
            'calculations': calculations,
            'total_reward': sum(calc['reward_amount'] for calc in calculations)
        })

    def _rule_applies_to_transaction(self, reward_rule, amount, category_id, payee_id):
        """Check if a reward rule applies to a specific transaction"""
        # Check activation requirements
        for requirement in reward_rule.activation_requirements.filter(is_active=True):
            if not self._requirement_met(requirement, amount, category_id, payee_id):
                return False

        # Check rule-specific conditions
        if reward_rule.rule_type == 'STATIC':
            return self._static_rule_applies(reward_rule.static_rule, amount, category_id, payee_id)
        elif reward_rule.rule_type == 'ROTATING':
            return self._rotating_rule_applies(reward_rule.rotating_rule, amount, category_id, payee_id)
        elif reward_rule.rule_type == 'DYNAMIC':
            return self._dynamic_rule_applies(reward_rule.dynamic_rule, amount, category_id, payee_id)

        return False

    def _requirement_met(self, requirement, amount, category_id, payee_id):
        """Check if an activation requirement is met"""
        if requirement.requirement_type == 'MIN_SPEND':
            return amount >= requirement.min_amount
        elif requirement.requirement_type == 'MIN_TRANSACTIONS':
            # This would need to check transaction count in a time period
            return True  # Simplified for now
        elif requirement.requirement_type == 'ENROLLMENT':
            return True  # Simplified for now
        elif requirement.requirement_type == 'CATEGORY_SPEND':
            if category_id:
                return requirement.categories.filter(id=category_id).exists()
            return False
        elif requirement.requirement_type == 'PAYEE_SPEND':
            if payee_id:
                return requirement.payees.filter(id=payee_id).exists()
            return False
        elif requirement.requirement_type == 'TIME_PERIOD':
            today = date.today()
            return (not requirement.start_date or today >= requirement.start_date) and \
                   (not requirement.end_date or today <= requirement.end_date)

        return True

    def _static_rule_applies(self, static_rule, amount, category_id, payee_id):
        """Check if a static rule applies to a transaction"""
        if amount < static_rule.min_spend:
            return False

        # Check categories
        if static_rule.categories.exists():
            if not category_id or not static_rule.categories.filter(id=category_id).exists():
                return False

        # Check payees
        if static_rule.payees.exists():
            if not payee_id or not static_rule.payees.filter(id=payee_id).exists():
                return False

        return True

    def _rotating_rule_applies(self, rotating_rule, amount, category_id, payee_id):
        """Check if a rotating rule applies to a transaction"""
        today = date.today()

        # Check if rule is active for current period
        if not (rotating_rule.start_date <= today <= rotating_rule.end_date):
            return False

        if amount < rotating_rule.min_spend:
            return False

        # Check categories
        if rotating_rule.categories.exists():
            if not category_id or not rotating_rule.categories.filter(id=category_id).exists():
                return False

        # Check payees
        if rotating_rule.payees.exists():
            if not payee_id or not rotating_rule.payees.filter(id=payee_id).exists():
                return False

        return True

    def _dynamic_rule_applies(self, dynamic_rule, amount, category_id, payee_id):
        """Check if a dynamic rule applies to a transaction"""
        if amount < dynamic_rule.min_spend:
            return False

        # Check categories
        if dynamic_rule.categories.exists():
            if not category_id or not dynamic_rule.categories.filter(id=category_id).exists():
                return False

        # Check payees
        if dynamic_rule.payees.exists():
            if not payee_id or not dynamic_rule.payees.filter(id=payee_id).exists():
                return False

        return True

    def _calculate_reward(self, reward_rule, amount):
        """Calculate the reward for a transaction"""
        if reward_rule.rule_type == 'STATIC':
            return self._calculate_static_reward(reward_rule.static_rule, amount)
        elif reward_rule.rule_type == 'ROTATING':
            return self._calculate_rotating_reward(reward_rule.rotating_rule, amount)
        elif reward_rule.rule_type == 'DYNAMIC':
            return self._calculate_dynamic_reward(reward_rule.dynamic_rule, amount)

        return None

    def _calculate_static_reward(self, static_rule, amount):
        """Calculate reward for a static rule"""
        reward_amount = (amount * static_rule.percentage) / 100

        if static_rule.max_reward:
            reward_amount = min(reward_amount, static_rule.max_reward)

        result = {
            'percentage': static_rule.percentage,
            'reward_amount': reward_amount
        }

        if static_rule.points_program:
            result['points_earned'] = reward_amount * static_rule.points_multiplier
            result['points_program'] = static_rule.points_program
            result['points_program_name'] = static_rule.points_program.name

        return result

    def _calculate_rotating_reward(self, rotating_rule, amount):
        """Calculate reward for a rotating rule"""
        reward_amount = (amount * rotating_rule.percentage) / 100

        if rotating_rule.max_reward:
            reward_amount = min(reward_amount, rotating_rule.max_reward)

        result = {
            'percentage': rotating_rule.percentage,
            'reward_amount': reward_amount
        }

        if rotating_rule.points_program:
            result['points_earned'] = reward_amount * rotating_rule.points_multiplier
            result['points_program'] = rotating_rule.points_program
            result['points_program_name'] = rotating_rule.points_program.name

        return result

    def _calculate_dynamic_reward(self, dynamic_rule, amount):
        """Calculate reward for a dynamic rule"""
        # Find the applicable tier
        applicable_tier = None
        for tier in dynamic_rule.tiers.all():
            if tier.min_spend <= amount and (not tier.max_spend or amount <= tier.max_spend):
                applicable_tier = tier
                break

        if not applicable_tier:
            # Use base percentage if no tier applies
            reward_amount = (amount * dynamic_rule.base_percentage) / 100
            percentage = dynamic_rule.base_percentage
            points_multiplier = dynamic_rule.base_points_multiplier
        else:
            reward_amount = (amount * applicable_tier.percentage) / 100
            percentage = applicable_tier.percentage
            points_multiplier = applicable_tier.points_multiplier

        if dynamic_rule.max_reward:
            reward_amount = min(reward_amount, dynamic_rule.max_reward)

        result = {
            'percentage': percentage,
            'reward_amount': reward_amount
        }

        if dynamic_rule.points_program:
            result['points_earned'] = reward_amount * points_multiplier
            result['points_program'] = dynamic_rule.points_program
            result['points_program_name'] = dynamic_rule.points_program.name

        return result

class RewardRuleAssignmentViewSet(viewsets.ModelViewSet):
    queryset = RewardRuleAssignment.objects.filter(is_active=True)
    serializer_class = RewardRuleAssignmentSerializer

    def get_queryset(self):
        queryset = RewardRuleAssignment.objects.filter(is_active=True)
        credit_card_id = self.request.query_params.get('credit_card_id', None)
        if credit_card_id:
            queryset = queryset.filter(credit_card_id=credit_card_id)
        return queryset

class RewardCalculationViewSet(viewsets.ModelViewSet):
    queryset = RewardCalculation.objects.filter(is_active=True)
    serializer_class = RewardCalculationSerializer

    def get_queryset(self):
        queryset = RewardCalculation.objects.filter(is_active=True)
        transaction_id = self.request.query_params.get('transaction_id', None)
        credit_card_id = self.request.query_params.get('credit_card_id', None)

        if transaction_id:
            queryset = queryset.filter(transaction_id=transaction_id)
        if credit_card_id:
            queryset = queryset.filter(credit_card_id=credit_card_id)

        return queryset

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary of reward calculations"""
        credit_card_id = request.query_params.get('credit_card_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        queryset = self.get_queryset()

        if credit_card_id:
            queryset = queryset.filter(credit_card_id=credit_card_id)
        if start_date:
            queryset = queryset.filter(calculation_date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(calculation_date__date__lte=end_date)

        summary = queryset.aggregate(
            total_reward_amount=Sum('reward_amount'),
            total_points_earned=Sum('points_earned'),
            total_transactions=Count('transaction_id', distinct=True)
        )

        return Response(summary)