import invariant from 'tiny-invariant';
import { TransactionResult, Transaction } from '@mysten/sui/transactions';
import { BigintIsh, Coin, NETWORK, Percent } from '../../core';
import { Swap } from './Swap';
import { CONFIGS, MODULE_UNIVERSAL_ROUTER } from '../constants';

export class Route<CInput extends Coin, COutput extends Coin> {
  public readonly network!: NETWORK;
  public readonly paths!: Swap<CInput, COutput, any>[];
  public readonly input!: CInput;
  public readonly output!: COutput;
  public readonly amountIn!: BigintIsh;
  public readonly amountOut!: BigintIsh;
  public readonly slippage!: Percent;

  constructor(network: NETWORK, paths: Swap<CInput, COutput, any>[]) {
    invariant(
      paths.length > 0,
      'PATHS'
    );

    this.network = network;
    this.paths = paths;
    this.input = paths[0].input;
    this.output = paths[paths.length - 1].output;
    this.amountIn = paths[0].amountIn;
    this.amountOut = paths[paths.length - 1].amountOut;
  }

  public swap(
    tradeObject: TransactionResult,
    slippage: Percent,
    tx: Transaction
  ) {
    const firstPath = this.paths[0];
    const routeObject = tx.moveCall({
      target: `${CONFIGS[this.network].packageId
        }::${MODULE_UNIVERSAL_ROUTER}::start_routing`,
      typeArguments: [
        this.input.coinType,
        this.output.coinType,
        firstPath.output.coinType,
      ],
      arguments: [tradeObject],
    });

    for (const [index, path] of this.paths.entries()) {
      path.swap(routeObject, slippage, tx);

      //next to the next path if necessary
      const nextPath = this.paths[index + 1];
      if (nextPath) {
        tx.moveCall({
          target: `${CONFIGS[this.network].packageId
            }::${MODULE_UNIVERSAL_ROUTER}::next`,
          typeArguments: [
            path.input.coinType,
            path.output.coinType,
            nextPath.output.coinType,
          ],
          arguments: [routeObject],
        });
      }
    }

    const lastPath = this.paths[this.paths.length - 1];
    return tx.moveCall({
      target: `${CONFIGS[this.network].packageId
        }::${MODULE_UNIVERSAL_ROUTER}::finish_routing`,
      typeArguments: [
        this.input.coinType,
        this.output.coinType,
        lastPath.input.coinType,
      ],
      arguments: [tradeObject, routeObject],
    });
  }
}
