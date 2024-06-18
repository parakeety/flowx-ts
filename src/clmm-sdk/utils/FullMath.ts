import BN from 'bn.js';
import { ONE, ZERO } from '../../core';

export abstract class FullMath {
  public static mulDivRoundingUp(a: BN, b: BN, denominator: BN): BN {
    const product = a.mul(b);
    let result = product.div(denominator);
    if (product.mod(denominator).eq(ZERO)) result = result.add(ONE);
    return result;
  }
}
