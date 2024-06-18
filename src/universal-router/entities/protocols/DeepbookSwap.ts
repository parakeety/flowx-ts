import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { BigintIsh, Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions } from '../Swap';
import { CONFIGS, MODULE_UNIVERSAL_ROUTER, Protocol } from '../../constants';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';

export interface DeepbookSwapOptions<CInput extends Coin, COutput extends Coin>
  extends SwapConstructorOptions<CInput, COutput> {
  xForY: boolean;
  lotSize: BigintIsh;
}

export class DeepbookSwap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<CInput, COutput, DeepbookSwapOptions<CInput, COutput>> {
  public readonly xForY!: boolean;
  public readonly lotSize!: BigintIsh;

  constructor(options: DeepbookSwapOptions<CInput, COutput>) {
    super(options);
    this.xForY = options.xForY;
    this.lotSize = options.lotSize;
  }

  public protocol(): Protocol {
    return Protocol.DEEPBOOK;
  }

  public swap(
    routeObject: TransactionResult,
    slippage: Percent,
    tx: Transaction
  ): void {
    tx.moveCall({
      target: `${
        CONFIGS[this.network].packageId
      }::${MODULE_UNIVERSAL_ROUTER}::${
        this.xForY
          ? 'deepbook_swap_exact_base_for_quote'
          : 'deepbook_swap_exact_quote_for_base'
      }`,
      typeArguments: [
        this.xForY ? this.input.coinType : this.output.coinType,
        this.xForY ? this.output.coinType : this.input.coinType,
      ],
      arguments: this.xForY
        ? [
            tx.object(CONFIGS[this.network].treasuryObjectId),
            routeObject,
            tx.object(this.pool.id),
            tx.pure.u64(this.lotSize.toString()),
            tx.object(SUI_CLOCK_OBJECT_ID),
          ]
        : [
            tx.object(CONFIGS[this.network].treasuryObjectId),
            routeObject,
            tx.object(this.pool.id),
            tx.object(SUI_CLOCK_OBJECT_ID),
          ],
    });
  }
}
