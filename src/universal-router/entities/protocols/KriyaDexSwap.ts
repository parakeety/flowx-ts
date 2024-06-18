import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions } from '../Swap';
import { CONFIGS, MODULE_UNIVERSAL_ROUTER, Protocol } from '../../constants';

export interface KriyaDexSwapSwapOptions<
  CInput extends Coin,
  COutput extends Coin
> extends SwapConstructorOptions<CInput, COutput> {
  xForY: boolean;
}

export class KriyaDexSwap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<CInput, COutput, KriyaDexSwapSwapOptions<CInput, COutput>> {
  public readonly xForY!: boolean;

  constructor(options: KriyaDexSwapSwapOptions<CInput, COutput>) {
    super(options);
    this.xForY = options.xForY;
  }

  public override protocol(): Protocol {
    return Protocol.KRIYA_DEX;
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
        this.xForY ? 'kriya_swap_exact_x_to_y' : 'kriya_swap_exact_y_to_x'
      }`,
      typeArguments: [
        this.xForY ? this.input.coinType : this.output.coinType,
        this.xForY ? this.output.coinType : this.input.coinType,
      ],
      arguments: [routeObject, tx.object(this.pool.id)],
    });
  }
}
