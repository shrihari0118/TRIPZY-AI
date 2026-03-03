"""
plan_customizer.py
Stub service for plan personalization.

IMPORTANT: Personalization is 100% client-side in the frontend (BudgetPlanner.tsx).
The backend has no /personalize endpoint and does not store user overrides.
This stub exists to make the architecture explicit and reserve the namespace
for future server-side personalization features (e.g., saved preferences, AI suggestions).
"""
from __future__ import annotations


class PlanCustomizerService:
    """
    Stub: No backend personalization logic.
    The frontend applies overrides via local React state (customizations).
    On refresh, the frontend re-applies its overrides on top of refreshed base plans.
    """

    def apply_customization(self, *args, **kwargs) -> None:
        """
        TODO (future): Accept user preference overrides and persist them.
        TODO (future): Return AI-suggested personalizations based on user history.
        """
        raise NotImplementedError(
            "Personalization is frontend-only. "
            "This method is reserved for future server-side personalization."
        )
