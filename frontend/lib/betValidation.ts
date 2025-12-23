/**
 * Bet amount validation utilities
 */

const BET_CONFIG = {
  MIN_BET: 0.01,
  MAX_BET: 9999999999.99,
  MAX_DECIMALS: 2,
  REGEX: /^\d+(\.\d{1,2})?$/,
};

export interface BetValidationResult {
  isValid: boolean;
  error?: string;
  value?: number;
}

/**
 * Validate bet amount format and range
 */
export const validateBetAmount = (
  betString: string,
  userBalance: number
): BetValidationResult => {
  // Check if empty
  if (!betString || betString.trim() === '') {
    return { isValid: false, error: 'Bet amount is required' };
  }

  // Check regex format (positive number with max 2 decimals)
  if (!BET_CONFIG.REGEX.test(betString)) {
    return {
      isValid: false,
      error: 'Bet must be a valid number with max 2 decimal places',
    };
  }

  const betAmount = parseFloat(betString);

  // Check for NaN
  if (isNaN(betAmount)) {
    return { isValid: false, error: 'Bet amount must be a valid number' };
  }

  // Check minimum bet
  if (betAmount < BET_CONFIG.MIN_BET) {
    return {
      isValid: false,
      error: `Bet must be at least $${BET_CONFIG.MIN_BET.toFixed(2)}`,
    };
  }

  // Check maximum bet
  if (betAmount > BET_CONFIG.MAX_BET) {
    return {
      isValid: false,
      error: `Bet cannot exceed $${BET_CONFIG.MAX_BET.toFixed(2)}`,
    };
  }

  // Check user balance
  if (betAmount > userBalance) {
    return {
      isValid: false,
      error: `Insufficient balance (you have $${userBalance.toFixed(2)})`,
    };
  }

  // Check decimal places
  const decimalPlaces = (betString.split('.')[1] || '').length;
  if (decimalPlaces > BET_CONFIG.MAX_DECIMALS) {
    return {
      isValid: false,
      error: 'Bet amount can have maximum 2 decimal places',
    };
  }

  return { isValid: true, value: betAmount };
};

/**
 * Sanitize bet input to remove invalid characters
 */
export const sanitizeBetInput = (input: string): string => {
  // Remove any non-numeric characters except decimal point
  const sanitized = input.replace(/[^\d.]/g, '');

  // Ensure only one decimal point
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }

  // Limit to 2 decimal places
  if (parts.length === 2) {
    return parts[0] + '.' + parts[1].substring(0, 2);
  }

  return sanitized;
};

/**
 * Format bet amount for display
 */
export const formatBetDisplay = (betString: string): string => {
  const bet = parseFloat(betString);
  if (isNaN(bet)) return '0.00';
  return bet.toFixed(2);
};
