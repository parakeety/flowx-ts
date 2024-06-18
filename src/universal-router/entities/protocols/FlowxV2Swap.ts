import { Coin, Percent } from '../../../core';
import { CONFIGS, MODULE_UNIVERSAL_ROUTER, Protocol } from '../../constants';
import { Swap, SwapConstructorOptions } from '../Swap';
import { Transaction, TransactionResult } from '@mysten/sui/transactions';

export class FlowxV2Swap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<CInput, COutput, SwapConstructorOptions<CInput, COutput>> {
  public protocol(): Protocol {
    return Protocol.FLOWX_V2;
  }

  public swap(
    routeObject: TransactionResult,
    slippage: Percent,
    tx: Transaction
  ) {
    tx.moveCall({
      target: `${
        CONFIGS[this.network].packageId
      }::${MODULE_UNIVERSAL_ROUTER}::flowx_swap_exact_input`,
      typeArguments: [this.input.coinType, this.output.coinType],
      arguments: [
        routeObject,
        tx.object(CONFIGS[this.network].protocols.flowxV2.containerObjectId),
      ],
    });
  }
}
