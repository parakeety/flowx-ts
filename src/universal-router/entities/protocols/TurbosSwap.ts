import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { BigintIsh, Coin, Fraction, Percent } from '../../../core';
import { Swap, SwapConstructorOptions } from '../Swap';
import { CONFIGS, MODULE_UNIVERSAL_ROUTER, Protocol } from '../../constants';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';

export interface TurbosSwapOptions<CInput extends Coin, COutput extends Coin>
  extends SwapConstructorOptions<CInput, COutput> {
  poolFee: BigintIsh;
  xForY: boolean;
  sqrtPriceX64Limit: BigintIsh;
  minSqrtPriceX64HasLiquidity: BigintIsh;
  maxSqrtPriceX64HasLiquidity: BigintIsh;
}

export class TurbosSwap<CInput extends Coin, COutput extends Coin> extends Swap<
  CInput,
  COutput,
  TurbosSwapOptions<CInput, COutput>
> {
  public readonly xForY!: boolean;
  public readonly poolFee!: BigintIsh;
  public readonly sqrtPriceX64Limit!: BigintIsh;
  public readonly minSqrtPriceX64HasLiquidity!: BigintIsh;
  public readonly maxSqrtPriceX64HasLiquidity!: BigintIsh;

  constructor(options: TurbosSwapOptions<CInput, COutput>) {
    super(options);
    this.xForY = options.xForY;
    this.poolFee = options.poolFee;
    this.sqrtPriceX64Limit = options.sqrtPriceX64Limit;
    this.maxSqrtPriceX64HasLiquidity = options.maxSqrtPriceX64HasLiquidity;
    this.minSqrtPriceX64HasLiquidity = options.minSqrtPriceX64HasLiquidity;
  }

  public override protocol(): Protocol {
    return Protocol.TURBOS_FIANCE;
  }

  public swap(
    routeObject: TransactionResult,
    slippage: Percent,
    tx: Transaction
  ): void {
    const sqrtPriceX64LimitAdjusted = this.xForY
      ? new Fraction(this.sqrtPriceX64Limit).multiply(
          new Percent(1).subtract(slippage)
        )
      : new Fraction(this.sqrtPriceX64Limit).multiply(slippage.add(1));

    tx.moveCall({
      target: `${
        CONFIGS[this.network].packageId
      }::${MODULE_UNIVERSAL_ROUTER}::${
        this.xForY ? 'turbos_swap_exact_x_to_y' : 'turbos_swap_exact_y_to_x'
      }`,
      typeArguments: [
        this.xForY ? this.input.coinType : this.output.coinType,
        this.xForY ? this.output.coinType : this.input.coinType,
        `${CONFIGS[this.network].protocols.turbos.packageId}::fee${
          this.poolFee
        }bps::FEE${this.poolFee}BPS`,
      ],
      arguments: [
        routeObject,
        tx.object(this.pool.id),
        tx.pure.u128(
          this.xForY
            ? Fraction.max(
                sqrtPriceX64LimitAdjusted,
                new Fraction(this.minSqrtPriceX64HasLiquidity)
              ).toFixed(0)
            : Fraction.min(
                sqrtPriceX64LimitAdjusted,
                new Fraction(this.maxSqrtPriceX64HasLiquidity)
              ).toFixed(0)
        ),
        tx.object(CONFIGS[this.network].protocols.turbos.versionedObjectId),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  }
}
