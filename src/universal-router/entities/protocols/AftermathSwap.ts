import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { Coin, Percent } from '../../../core';
import { Swap, SwapConstructorOptions } from '../Swap';
import { CONFIGS, MODULE_UNIVERSAL_ROUTER, Protocol } from '../../constants';

export interface AftermathSwapOptions<CInput extends Coin, COutput extends Coin>
  extends SwapConstructorOptions<CInput, COutput> {
  lpCoinType: string;
}

export class AftermathSwap<
  CInput extends Coin,
  COutput extends Coin
> extends Swap<CInput, COutput, AftermathSwapOptions<CInput, COutput>> {
  public readonly lpCoinType!: string;
  constructor(options: AftermathSwapOptions<CInput, COutput>) {
    super(options);
    this.lpCoinType = options.lpCoinType;
  }

  public protocol(): Protocol {
    return Protocol.AFTERMATH;
  }

  public swap(
    routeObject: TransactionResult,
    slippage: Percent,
    tx: Transaction
  ): void {
    tx.moveCall({
      target: `${
        CONFIGS[this.network].packageId
      }::${MODULE_UNIVERSAL_ROUTER}::aftermath_swap_exact_input`,
      typeArguments: [
        this.lpCoinType,
        this.input.coinType,
        this.output.coinType,
      ],
      arguments: [
        routeObject,
        tx.object(
          CONFIGS[this.network].protocols.aftermath.poolRegistryObjectId
        ),
        tx.object(this.pool.id),
        tx.object(
          CONFIGS[this.network].protocols.aftermath.protocolFeeVaultObjectId
        ),
        tx.object(CONFIGS[this.network].protocols.aftermath.treasuryObjectId),
        tx.object(
          CONFIGS[this.network].protocols.aftermath.insuranceFundObjectId
        ),
        tx.object(
          CONFIGS[this.network].protocols.aftermath.referralVaultOjectId
        ),
        tx.pure.u64(this.amountOut.toString()),
      ],
    });
  }
}
