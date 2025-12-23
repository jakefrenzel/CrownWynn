import re
from decimal import Decimal, InvalidOperation

class BetValidator:
    """Validator for game bet amounts"""
    
    MIN_BET = Decimal('0.01')
    MAX_BET = Decimal('9999999999.99')
    MAX_DECIMALS = 2
    BET_REGEX = r'^\d+(\.\d{1,2})?$'
    
    @staticmethod
    def validate_bet_amount(bet_input, user_balance=None):
        """
        Validate bet amount
        Returns: (is_valid: bool, error: str or None, value: Decimal or None)
        """
        if bet_input is None:
            return False, "Bet amount is required", None
        
        # Try to convert to Decimal
        try:
            bet_amount = Decimal(str(bet_input))
        except (InvalidOperation, TypeError, ValueError):
            return False, "Bet must be a valid number", None
        
        # Check for negative
        if bet_amount < 0:
            return False, "Bet amount cannot be negative", None
        
        # Check minimum
        if bet_amount < BetValidator.MIN_BET:
            return False, f"Bet must be at least ${float(BetValidator.MIN_BET):.2f}", None
        
        # Check maximum
        if bet_amount > BetValidator.MAX_BET:
            return False, f"Bet cannot exceed ${float(BetValidator.MAX_BET):.2f}", None
        
        # Check decimal places
        if bet_amount.as_tuple().exponent < -BetValidator.MAX_DECIMALS:
            return False, f"Bet can have maximum {BetValidator.MAX_DECIMALS} decimal places", None
        
        # Check user balance if provided
        if user_balance is not None:
            user_balance_decimal = Decimal(str(user_balance))
            if bet_amount > user_balance_decimal:
                return False, f"Insufficient balance (you have ${float(user_balance_decimal):.2f})", None
        
        return True, None, bet_amount
