import { describe, it, expect } from 'vitest';
import { CurrencyUtil } from '../../src/utils/currency';

describe('CurrencyUtil Unit Tests', () => {
  describe('toCents', () => {
    it('correctly converts standard integer amounts to cents', () => {
      expect(CurrencyUtil.toCents(100)).toBe(10000);
      expect(CurrencyUtil.toCents(1)).toBe(100);
      expect(CurrencyUtil.toCents(50)).toBe(5000);
    });

    it('correctly converts decimal amounts without floating point errors', () => {
      expect(CurrencyUtil.toCents(100.5)).toBe(10050);
      expect(CurrencyUtil.toCents(0.1)).toBe(10);
      expect(CurrencyUtil.toCents(0.2)).toBe(20);
      expect(CurrencyUtil.toCents(0.99)).toBe(99);
      expect(CurrencyUtil.toCents(19.99)).toBe(1999);
    });

    it('throws an error for non-positive amounts', () => {
      expect(() => CurrencyUtil.toCents(0)).toThrow('Amount must be greater than 0');
      expect(() => CurrencyUtil.toCents(-10)).toThrow('Amount must be greater than 0');
    });

    it('throws an error for amounts with more than 2 decimal places', () => {
      expect(() => CurrencyUtil.toCents(10.123)).toThrow('Amount cannot have more than 2 decimal places');
      expect(() => CurrencyUtil.toCents(0.001)).toThrow('Amount cannot have more than 2 decimal places');
    });

    it('throws an error for NaN, Infinity, or non-numbers', () => {
      expect(() => CurrencyUtil.toCents(NaN)).toThrow('Amount must be a valid number');
      expect(() => CurrencyUtil.toCents(Infinity)).toThrow('Amount must be a valid number');
      expect(() => CurrencyUtil.toCents('100' as any)).toThrow('Amount must be a valid number');
    });
  });

  describe('toAmount', () => {
    it('correctly converts cents to standard currency decimal units', () => {
      expect(CurrencyUtil.toAmount(10000)).toBe(100.0);
      expect(CurrencyUtil.toAmount(10050)).toBe(100.5);
      expect(CurrencyUtil.toAmount(99)).toBe(0.99);
      expect(CurrencyUtil.toAmount(0)).toBe(0.0);
    });

    it('throws an error for invalid cents', () => {
      expect(() => CurrencyUtil.toAmount(10.5)).toThrow('Cents must be an integer');
      expect(() => CurrencyUtil.toAmount(NaN)).toThrow('Cents must be an integer');
    });
  });
});
