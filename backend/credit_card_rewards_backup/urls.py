from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RewardsCategoryViewSet, RewardsPayeeViewSet, PaymentMethodViewSet, PointsProgramViewSet,
    RewardRuleViewSet, StaticRewardRuleViewSet, RotatingRewardRuleViewSet, DynamicRewardRuleViewSet,
    DynamicRewardTierViewSet, ActivationRequirementViewSet, RewardRuleAssignmentViewSet, RewardCalculationViewSet
)

router = DefaultRouter()
router.register(r'categories', RewardsCategoryViewSet)
router.register(r'payees', RewardsPayeeViewSet)
router.register(r'payment-methods', PaymentMethodViewSet)
router.register(r'points-programs', PointsProgramViewSet)
router.register(r'reward-rules', RewardRuleViewSet)
router.register(r'static-rules', StaticRewardRuleViewSet)
router.register(r'rotating-rules', RotatingRewardRuleViewSet)
router.register(r'dynamic-rules', DynamicRewardRuleViewSet)
router.register(r'dynamic-tiers', DynamicRewardTierViewSet)
router.register(r'activation-requirements', ActivationRequirementViewSet)
router.register(r'rule-assignments', RewardRuleAssignmentViewSet)
router.register(r'calculations', RewardCalculationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]