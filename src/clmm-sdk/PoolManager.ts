import { Transaction } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import { NETWORK } from '../core';
import {
  MODULE_POOL_MANAGER,
  PACKAGE_ID_MAPPING,
  POOL_REGISTRY_OBJECT_ID_MAPPING,
  VERSIONED_OBJECT_MAPPING,
} from './constants';
import { Pool } from './entities';

export class PoolManager {
  constructor(public readonly network: NETWORK = 'mainnet') {}

  public createPool(pool: Pool, tx: Transaction) {
    tx.moveCall({
      target: `${
        PACKAGE_ID_MAPPING[this.network]
      }::${MODULE_POOL_MANAGER}::create_and_initialize_pool`,
      typeArguments: [pool.coins[0].coinType, pool.coins[1].coinType],
      arguments: [
        tx.object(POOL_REGISTRY_OBJECT_ID_MAPPING[this.network]),
        tx.pure.u64(pool.fee),
        tx.pure.u128(pool.sqrtPriceX64.toString()),
        tx.object(VERSIONED_OBJECT_MAPPING[this.network]),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  }
}
