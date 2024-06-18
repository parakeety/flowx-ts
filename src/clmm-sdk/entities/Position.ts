import BN from 'bn.js';
import invariant from 'tiny-invariant';

import {
  ADDRESS_ZERO,
  BigintIsh,
  Coin,
  ONE,
  ObjectId,
  Percent,
  Price,
  ZERO,
} from '../../core';
import { CoinAmount } from '../../core/entities/CoinAmount';
import { Pool } from './Pool';
import { LiquidityMath, SqrtPriceMath, TickMath, tickToPrice } from '../utils';
import { encodeSqrtRatioX64 } from '../utils/encodeSqrtRatioX64';

interface PositionConstructorArgs {
  objectId?: string;
  owner: string;
  pool: Pool;
  tickLower: number;
  tickUpper: number;
  liquidity: BigintIsh;
}

export class Position extends ObjectId {
  public readonly owner: string;
  public readonly pool: Pool;
  public readonly tickLower: number;
  public readonly tickUpper: number;
  public readonly liquidity: BN;

  private _coinXAmount: CoinAmount<Coin> | null = null;
  private _coinYAmount: CoinAmount<Coin> | null = null;
  private _mintAmounts: Readonly<{ amountX: BN; amountY: BN }> | null = null;

  public constructor({
    objectId,
    owner,
    pool,
    tickLower,
    tickUpper,
    liquidity,
  }: PositionConstructorArgs) {
    invariant(tickLower < tickUpper, 'TICK_ORDER');
    invariant(
      tickLower >= TickMath.MIN_TICK && tickLower % pool.tickSpacing === 0,
      'TICK_LOWER'
    );
    invariant(
      tickUpper <= TickMath.MAX_TICK && tickUpper % pool.tickSpacing === 0,
      'TICK_UPPER'
    );

    super(objectId || ADDRESS_ZERO);
    this.owner = owner;
    this.pool = pool;
    this.tickLower = tickLower;
    this.tickUpper = tickUpper;
    this.liquidity = new BN(liquidity);
  }

  public get priceLower(): Price<Coin, Coin> {
    return tickToPrice(this.pool.coins[0], this.pool.coins[1], this.tickLower);
  }

  public get priceUpper(): Price<Coin, Coin> {
    return tickToPrice(this.pool.coins[0], this.pool.coins[1], this.tickUpper);
  }

  public get amountX(): CoinAmount<Coin> {
    if (this._coinXAmount === null) {
      if (this.pool.tickCurrent < this.tickLower) {
        this._coinXAmount = CoinAmount.fromRawAmount(
          this.pool.coins[0],
          SqrtPriceMath.getAmountXDelta(
            TickMath.tickIndexToSqrtPriceX64(this.tickLower),
            TickMath.tickIndexToSqrtPriceX64(this.tickUpper),
            this.liquidity,
            false
          )
        );
      } else if (this.pool.tickCurrent < this.tickUpper) {
        this._coinXAmount = CoinAmount.fromRawAmount(
          this.pool.coins[1],
          SqrtPriceMath.getAmountYDelta(
            new BN(this.pool.sqrtPriceX64),
            TickMath.tickIndexToSqrtPriceX64(this.tickUpper),
            this.liquidity,
            false
          )
        );
      } else {
        this._coinXAmount = CoinAmount.fromRawAmount(this.pool.coins[0], ZERO);
      }
    }
    return this._coinXAmount;
  }

  /**
   * Returns the amount of token1 that this position's liquidity could be burned for at the current pool price
   */
  public get amountY(): CoinAmount<Coin> {
    if (this._coinYAmount === null) {
      if (this.pool.tickCurrent < this.tickLower) {
        this._coinYAmount = CoinAmount.fromRawAmount(this.pool.coins[1], ZERO);
      } else if (this.pool.tickCurrent < this.tickUpper) {
        this._coinYAmount = CoinAmount.fromRawAmount(
          this.pool.coins[1],
          SqrtPriceMath.getAmountYDelta(
            TickMath.tickIndexToSqrtPriceX64(this.tickLower),
            new BN(this.pool.sqrtPriceX64),
            this.liquidity,
            false
          )
        );
      } else {
        this._coinYAmount = CoinAmount.fromRawAmount(
          this.pool.coins[1],
          SqrtPriceMath.getAmountYDelta(
            TickMath.tickIndexToSqrtPriceX64(this.tickLower),
            TickMath.tickIndexToSqrtPriceX64(this.tickUpper),
            this.liquidity,
            false
          )
        );
      }
    }
    return this._coinYAmount;
  }

  public get mintAmounts(): Readonly<{ amountX: BN; amountY: BN }> {
    if (this._mintAmounts === null) {
      if (this.pool.tickCurrent < this.tickLower) {
        return {
          amountX: SqrtPriceMath.getAmountXDelta(
            TickMath.tickIndexToSqrtPriceX64(this.tickLower),
            TickMath.tickIndexToSqrtPriceX64(this.tickUpper),
            this.liquidity,
            true
          ),
          amountY: ZERO,
        };
      } else if (this.pool.tickCurrent < this.tickUpper) {
        return {
          amountX: SqrtPriceMath.getAmountYDelta(
            new BN(this.pool.sqrtPriceX64),
            TickMath.tickIndexToSqrtPriceX64(this.tickUpper),
            this.liquidity,
            true
          ),
          amountY: SqrtPriceMath.getAmountYDelta(
            TickMath.tickIndexToSqrtPriceX64(this.tickLower),
            new BN(this.pool.sqrtPriceX64),
            this.liquidity,
            true
          ),
        };
      } else {
        return {
          amountX: ZERO,
          amountY: SqrtPriceMath.getAmountYDelta(
            TickMath.tickIndexToSqrtPriceX64(this.tickLower),
            TickMath.tickIndexToSqrtPriceX64(this.tickUpper),
            this.liquidity,
            true
          ),
        };
      }
    }
    return this._mintAmounts;
  }

  public static fromAmounts({
    owner,
    pool,
    tickLower,
    tickUpper,
    amountX,
    amountY,
    useFullPrecision,
  }: {
    owner: string;
    pool: Pool;
    tickLower: number;
    tickUpper: number;
    amountX: BigintIsh;
    amountY: BigintIsh;
    useFullPrecision: boolean;
  }) {
    const sqrtRatioAX64 = TickMath.tickIndexToSqrtPriceX64(tickLower);
    const sqrtRatioBX64 = TickMath.tickIndexToSqrtPriceX64(tickUpper);
    return new Position({
      owner,
      pool,
      tickLower,
      tickUpper,
      liquidity: LiquidityMath.maxLiquidityForAmounts(
        new BN(pool.sqrtPriceX64),
        sqrtRatioAX64,
        sqrtRatioBX64,
        amountX,
        amountY,
        useFullPrecision
      ),
    });
  }

  /**
   * Returns the lower and upper sqrt ratios if the price 'slips' up to slippage tolerance percentage
   * @param slippageTolerance The amount by which the price can 'slip' before the transaction will revert
   * @returns The sqrt ratios after slippage
   */
  private ratiosAfterSlippage(slippageTolerance: Percent): {
    sqrtRatioX64Lower: BN;
    sqrtRatioX64Upper: BN;
  } {
    const priceLower = this.pool.coinXPrice.asFraction.multiply(
      new Percent(1).subtract(slippageTolerance)
    );
    const priceUpper = this.pool.coinXPrice.asFraction.multiply(
      slippageTolerance.add(1)
    );
    let sqrtRatioX64Lower = encodeSqrtRatioX64(
      priceLower.numerator,
      priceLower.denominator
    );
    if (sqrtRatioX64Lower.lte(TickMath.MIN_SQRT_RATIO)) {
      sqrtRatioX64Lower = TickMath.MIN_SQRT_RATIO.add(ONE);
    }
    let sqrtRatioX64Upper = encodeSqrtRatioX64(
      priceUpper.numerator,
      priceUpper.denominator
    );
    if (sqrtRatioX64Upper.gte(TickMath.MAX_SQRT_RATIO)) {
      sqrtRatioX64Upper = TickMath.MAX_SQRT_RATIO.sub(ONE);
    }
    return {
      sqrtRatioX64Lower,
      sqrtRatioX64Upper,
    };
  }

  /**
   * Returns the minimum amounts that must be sent in order to safely mint the amount of liquidity held by the position
   * with the given slippage tolerance
   * @param slippageTolerance Tolerance of unfavorable slippage from the current price
   * @returns The amounts, with slippage
   */
  public mintAmountsWithSlippage(
    slippageTolerance: Percent
  ): Readonly<{ amountX: BN; amountY: BN }> {
    // get lower/upper prices
    const { sqrtRatioX64Upper, sqrtRatioX64Lower } =
      this.ratiosAfterSlippage(slippageTolerance);

    // construct counterfactual pools
    const poolLower = new Pool(
      this.pool.id,
      this.pool.coins,
      this.pool.reserves,
      this.pool.fee,
      sqrtRatioX64Lower,
      0 /* liquidity doesn't matter */,
      TickMath.sqrtPriceX64ToTickIndex(sqrtRatioX64Lower)
    );
    const poolUpper = new Pool(
      this.pool.id,
      this.pool.coins,
      this.pool.reserves,
      this.pool.fee,
      sqrtRatioX64Lower,
      0 /* liquidity doesn't matter */,
      TickMath.sqrtPriceX64ToTickIndex(sqrtRatioX64Upper)
    );

    // because the router is imprecise, we need to calculate the position that will be created (assuming no slippage)
    const positionThatWillBeCreated = Position.fromAmounts({
      owner: this.owner,
      pool: this.pool,
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
      ...this.mintAmounts, // the mint amounts are what will be passed as calldata
      useFullPrecision: false,
    });

    // we want the smaller amounts...
    // ...which occurs at the upper price for amount0...
    const { amountX } = new Position({
      owner: this.owner,
      pool: poolUpper,
      liquidity: positionThatWillBeCreated.liquidity,
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
    }).mintAmounts;
    // ...and the lower for amount1
    const { amountY } = new Position({
      owner: this.owner,
      pool: poolLower,
      liquidity: positionThatWillBeCreated.liquidity,
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
    }).mintAmounts;

    return { amountX, amountY };
  }

  public burnAmountsWithSlippage(
    slippageTolerance: Percent
  ): Readonly<{ amountX: BN; amountY: BN }> {
    // get lower/upper prices
    const { sqrtRatioX64Upper, sqrtRatioX64Lower } =
      this.ratiosAfterSlippage(slippageTolerance);

    // construct counterfactual pools
    const poolLower = new Pool(
      this.pool.id,
      this.pool.coins,
      this.pool.reserves,
      this.pool.fee,
      sqrtRatioX64Lower,
      0 /* liquidity doesn't matter */,
      TickMath.sqrtPriceX64ToTickIndex(sqrtRatioX64Lower)
    );
    const poolUpper = new Pool(
      this.pool.id,
      this.pool.coins,
      this.pool.reserves,
      this.pool.fee,
      sqrtRatioX64Upper,
      0 /* liquidity doesn't matter */,
      TickMath.sqrtPriceX64ToTickIndex(sqrtRatioX64Upper)
    );

    // we want the smaller amounts...
    // ...which occurs at the upper price for amount0...
    const amountX = new Position({
      owner: this.owner,
      pool: poolUpper,
      liquidity: this.liquidity,
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
    }).amountX;
    // ...and the lower for amount1
    const amountY = new Position({
      owner: this.owner,
      pool: poolLower,
      liquidity: this.liquidity,
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
    }).amountY;

    return { amountX: amountX.quotient, amountY: amountY.quotient };
  }
}
