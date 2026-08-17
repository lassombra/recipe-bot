export interface RationalQuantity {
  numerator: number;
  denominator: number;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function simplify(quantity: RationalQuantity): RationalQuantity {
  if (!Number.isInteger(quantity.numerator) || !Number.isInteger(quantity.denominator)) {
    throw new Error('Quantity must use integer numerator and denominator.');
  }
  if (quantity.numerator <= 0) {
    throw new Error('Quantity numerator must be a positive integer.');
  }
  if (quantity.denominator <= 0) {
    throw new Error('Quantity denominator must be a positive integer.');
  }

  const numerator = quantity.numerator;
  const denominator = quantity.denominator;
  const divisor = gcd(numerator, denominator);

  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
}

export function addQuantities(a: RationalQuantity, b: RationalQuantity): RationalQuantity {
  return simplify({
    numerator: a.numerator * b.denominator + b.numerator * a.denominator,
    denominator: a.denominator * b.denominator,
  });
}

export function parseQuantity(input: string): RationalQuantity {
  const value = input.trim();
  if (!value) {
    throw new Error('Quantity cannot be empty.');
  }

  const mixedMatch = /^(\d+)\s+(\d+)\/(\d+)$/.exec(value);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const numerator = Number(mixedMatch[2]);
    const denominator = Number(mixedMatch[3]);
    if (whole <= 0) {
      throw new Error('Whole number in mixed fraction must be positive.');
    }
    if (denominator === 0 || numerator >= denominator) {
      throw new Error('Invalid mixed fraction quantity.');
    }
    return simplify({
      numerator: whole * denominator + numerator,
      denominator,
    });
  }

  const fractionMatch = /^(\d+)\/(\d+)$/.exec(value);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    return simplify({ numerator, denominator });
  }

  const integerMatch = /^(\d+)$/.exec(value);
  if (integerMatch) {
    return { numerator: Number(integerMatch[1]), denominator: 1 };
  }

  throw new Error('Invalid quantity format. Expected values like 1, 1/2, or 1 1/2.');
}

export function formatQuantity(quantity: RationalQuantity): string {
  const normalized = simplify(quantity);
  const whole = Math.floor(normalized.numerator / normalized.denominator);
  const remainder = normalized.numerator % normalized.denominator;

  if (remainder === 0) {
    return whole.toString();
  }

  if (whole === 0) {
    return `${remainder}/${normalized.denominator}`;
  }

  return `${whole} ${remainder}/${normalized.denominator}`;
}

export function toDbQuantity(quantity: RationalQuantity): { quantityNumerator: number; quantityDenominator: number } {
  const normalized = simplify(quantity);
  return {
    quantityNumerator: normalized.numerator,
    quantityDenominator: normalized.denominator,
  };
}

export function fromDbQuantity(quantityNumerator: number, quantityDenominator: number): RationalQuantity {
  return simplify({ numerator: quantityNumerator, denominator: quantityDenominator });
}
