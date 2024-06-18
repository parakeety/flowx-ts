import { Coin, Price, Q64 } from '../../core';
import { TickMath } from './TickMath';
import { encodeSqrtRatioX64 } from './encodeSqrtRatioX64';
/**
 * Returns a price object corresponding to the input tick and the base/quote token
 * Inputs must be tokens because the address order is used to interpret the price represented by the tick
 * @param baseCoin the base token of the price
 * @param quoteCoin the quote token of the price
 * @param tick the tick for which to return the price
 */
export function tickToPrice(
  baseCoin: Coin,
  quoteCoin: Coin,
  tick: number
): Price<Coin, Coin> {
  const sqrtRatioX64 = TickMath.tickIndexToSqrtPriceX64(tick);

  const ratioX128 = sqrtRatioX64.mul(sqrtRatioX64);

  return baseCoin.sortsBefore(quoteCoin)
    ? new Price(baseCoin, quoteCoin, Q64, ratioX128)
    : new Price(baseCoin, quoteCoin, ratioX128, Q64);
}

/**
 * Returns the first tick for which the given price is greater than or equal to the tick price
 * @param price for which to return the closest tick that represents a price less than or equal to the input price,
 * i.e. the price of the returned tick is less than or equal to the input price
 */
export function priceToClosestTick(price: Price<Coin, Coin>): number {
  const sorted = price.baseCoin.sortsBefore(price.quoteCoin);

  const sqrtRatioX96 = sorted
    ? encodeSqrtRatioX64(price.numerator, price.denominator)
    : encodeSqrtRatioX64(price.denominator, price.numerator);

  let tick = TickMath.sqrtPriceX64ToTickIndex(sqrtRatioX96);
  const nextTickPrice = tickToPrice(price.baseCoin, price.quoteCoin, tick + 1);
  if (sorted) {
    if (!price.lt(nextTickPrice)) {
      tick++;
    }
  } else {
    if (!price.gt(nextTickPrice)) {
      tick++;
    }
  }
  return tick;
}
