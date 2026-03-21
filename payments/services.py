"""
Simulates an external payment provider (Chapa/Telebirr).

For production, use chapa_service.py with real Chapa API integration.
"""

import secrets


class PaymentProviderSimulator:
    """
    Simulates an external payment provider (Chapa/Telebirr).

    Replace this later with real provider API calls while keeping the
    endpoint contract and validation logic in views/serializers.
    
    For real Chapa integration, see chapa_service.py
    """

    @staticmethod
    def generate_transaction_id() -> str:
        # provider-style opaque id; keep within max_length.
        return f"tx_{secrets.token_hex(16)}"

    @staticmethod
    def simulate_success(transaction_id: str) -> bool:
        # For now, always succeed.
        return bool(transaction_id)

