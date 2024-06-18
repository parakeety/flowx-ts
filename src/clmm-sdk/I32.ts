import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { MODULE_I32, PACKAGE_ID_MAPPING } from './constants';
import { NETWORK } from '../core';

export class I32 {
  constructor(public readonly network: NETWORK = 'mainnet') {}

  public create(value: number, tx: Transaction): TransactionResult {
    return tx.moveCall({
      target: `${PACKAGE_ID_MAPPING[this.network]}::${MODULE_I32}::${
        value >= 0 ? `from` : `neg_from`
      }`,
      arguments: [tx.pure.u32(Math.abs(value))],
    });
  }
}
