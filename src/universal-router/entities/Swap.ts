import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { BigintIsh, Coin, NETWORK, ObjectId, Percent, ZERO } from '../../core';
import { Protocol } from '../constants';
import invariant from 'tiny-invariant';

export interface SwapConstructorOptions<
  CInput extends Coin,
  COutput extends Coin
> {
  network: NETWORK;
  pool: ObjectId;
  input: CInput;
  output: COutput;
  amountIn: BigintIsh;
  amountOut: BigintIsh;
}

export abstract class Swap<
  CInput extends Coin,
  COutput extends Coin,
  Options extends SwapConstructorOptions<CInput, COutput>
> {
  public readonly network!: NETWORK;
  public readonly pool!: ObjectId;
  public readonly input!: CInput;
  public readonly output!: COutput;
  public readonly amountIn!: BigintIsh;
  public readonly amountOut!: BigintIsh;

  constructor(options: Options) {
    invariant(!options.input.equals(options.output), 'COINS');

    this.network = options.network;
    this.pool = options.pool;
    this.input = options.input;
    this.output = options.output;
    this.amountIn = options.amountIn;
    this.amountOut = options.amountOut;
  }

  public abstract swap(
    routeObject: TransactionResult,
    slippage: Percent,
    tx: Transaction
  ): void;

  public abstract protocol(): Protocol;
}
