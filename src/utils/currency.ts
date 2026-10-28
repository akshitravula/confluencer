// Monetary amounts are represented as integer cents internally to avoid IEEE 754 precision issues

export class CurrencyUtil {
  static toCents(amount: number): number {
    if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
      throw new Error('Amount must be a valid number');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const amountStr = amount.toString();
    const parts = amountStr.split('.');
    if (parts.length > 1 && parts[1].length > 2) {
      throw new Error('Amount cannot have more than 2 decimal places');
    }

    const cents = Math.round(amount * 100);
    if (!Number.isSafeInteger(cents)) {
      throw new Error('Amount exceeds maximum safe integer');
    }

    return cents;
  }

  static toAmount(cents: number): number {
    if (typeof cents !== 'number' || isNaN(cents) || !Number.isInteger(cents)) {
      throw new Error('Cents must be an integer');
    }
    return Number((cents / 100).toFixed(2));
  }
}
