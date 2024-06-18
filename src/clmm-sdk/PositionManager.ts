import {
  Transaction,
  TransactionArgument,
  TransactionResult,
} from '@mysten/sui/transactions';

import { BigintIsh, Coin, NETWORK, Percent } from '../core';
import { Position } from './entities';
import { PoolManager } from './PoolManager';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import {
  MODULE_POSITION_MANAGER,
  PACKAGE_ID_MAPPING,
  POOL_REGISTRY_OBJECT_ID_MAPPING,
  POSITION_REGISTRY_OBJECT_ID_MAPPING,
  VERSIONED_OBJECT_MAPPING,
} from './constants';
import { I32 } from './I32';
import { SUI_CLOCK_OBJECT_ID, isValidSuiAddress } from '@mysten/sui/utils';
import { CoinAmount } from '../core/entities/CoinAmount';
import invariant from 'tiny-invariant';

export interface IncreaseLiquidityOptions {
  amountX: BigintIsh;
  amountY: BigintIsh;
  slippageTolerance: Percent;
  deadline: number;
  createPosition?: boolean;
}

export interface DecreaseLiquidityOptions {
  slippageTolerance: Percent;
  deadline: number;
  collectOptions?: CollectOptions;
}

export interface CollectOptions {
  expectedCoinOwedX: CoinAmount<Coin>;
  expectedCoinOwedY: CoinAmount<Coin>;
  recipient?: string;
}

export interface CollectPoolRewardOptions {
  expectedRewardOwed: CoinAmount<Coin>;
  recipient?: string;
}

export class PositionManager {
  private i32: I32;

  constructor(
    public readonly network: NETWORK = 'mainnet',
    public readonly client = new SuiClient({ url: getFullnodeUrl('mainnet') })
  ) {
    this.i32 = new I32(this.network);
  }

  public openPosition(position: Position, tx: Transaction): TransactionResult {
    const [tickLowerI32, tickUpperI32] = [
      this.i32.create(position.tickLower, tx),
      this.i32.create(position.tickUpper, tx),
    ];

    return tx.moveCall({
      target: `${
        PACKAGE_ID_MAPPING[this.network]
      }::${MODULE_POSITION_MANAGER}::open_position`,
      typeArguments: [
        position.amountX.coin.coinType,
        position.amountY.coin.coinType,
      ],
      arguments: [
        tx.object(POSITION_REGISTRY_OBJECT_ID_MAPPING[this.network]),
        tx.object(POOL_REGISTRY_OBJECT_ID_MAPPING[this.network]),
        tx.pure.u64(position.pool.fee),
        tickLowerI32,
        tickUpperI32,
        tx.object(VERSIONED_OBJECT_MAPPING[this.network]),
      ],
    });
  }

  public async increaseLiquidity(
    position: Position,
    options: IncreaseLiquidityOptions,
    tx: Transaction
  ) {
    const { amountX: amountXDesired, amountY: amountYDesired } =
      position.mintAmounts;

    const minimumAmounts = position.mintAmountsWithSlippage(
      options.slippageTolerance
    );
    const amountXMin = minimumAmounts.amountX.toString();
    const amountYMin = minimumAmounts.amountY.toString();

    let positionObject: TransactionResult | TransactionArgument = tx.object(
      position.id
    );
    if (options.createPosition) {
      positionObject = this.openPosition(position, tx);
    }

    const [coinXIn, coinYIn] = await Promise.all([
      position.amountX.coin.take({
        owner: position.owner,
        amount: amountXDesired,
        tx,
        client: this.client,
      }),
      position.amountY.coin.take({
        owner: position.owner,
        amount: amountYDesired,
        tx,
        client: this.client,
      }),
    ]);

    tx.moveCall({
      target: `${
        PACKAGE_ID_MAPPING[this.network]
      }::${MODULE_POSITION_MANAGER}::increase_liquidity`,
      typeArguments: [
        position.amountX.coin.coinType,
        position.amountY.coin.coinType,
      ],
      arguments: [
        tx.object(POOL_REGISTRY_OBJECT_ID_MAPPING[this.network]),
        positionObject,
        tx.pure.u128(position.liquidity.toString()),
        coinXIn,
        coinYIn,
        tx.pure.u64(amountXMin),
        tx.pure.u64(amountYMin),
        tx.pure.u64(options.deadline),
        tx.object(VERSIONED_OBJECT_MAPPING[this.network]),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  }

  public decreaseLiquidity(
    position: Position,
    options: DecreaseLiquidityOptions,
    tx: Transaction
  ) {
    const minimumAmounts = position.burnAmountsWithSlippage(
      options.slippageTolerance
    );
    const amountXMin = minimumAmounts.amountX.toString();
    const amountYMin = minimumAmounts.amountY.toString();

    tx.moveCall({
      target: `${
        PACKAGE_ID_MAPPING[this.network]
      }::${MODULE_POSITION_MANAGER}::decrease_liquidity`,
      typeArguments: [
        position.amountX.coin.coinType,
        position.amountY.coin.coinType,
      ],
      arguments: [
        tx.object(POOL_REGISTRY_OBJECT_ID_MAPPING[this.network]),
        tx.object(position.id),
        tx.pure.u128(position.liquidity.toString()),
        tx.pure.u64(amountXMin),
        tx.pure.u64(amountYMin),
        tx.pure.u64(options.deadline),
        tx.object(VERSIONED_OBJECT_MAPPING[this.network]),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  }

  public collect(
    position: Position,
    options: CollectOptions,
    tx: Transaction
  ): TransactionResult | void {
    invariant(
      !options.recipient || isValidSuiAddress(options.recipient),
      'RECIPIENT'
    );

    const result = tx.moveCall({
      target: `${
        PACKAGE_ID_MAPPING[this.network]
      }::${MODULE_POSITION_MANAGER}::decrease_liquidity`,
      typeArguments: [
        position.amountX.coin.coinType,
        position.amountY.coin.coinType,
      ],
      arguments: [
        tx.object(POOL_REGISTRY_OBJECT_ID_MAPPING[this.network]),
        tx.object(position.id),
        tx.pure.u64(options.expectedCoinOwedX.quotient.toString()),
        tx.pure.u64(options.expectedCoinOwedY.quotient.toString()),
        tx.object(VERSIONED_OBJECT_MAPPING[this.network]),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });

    if (options.recipient) {
      tx.transferObjects([result[0], result[1]], options.recipient);
    } else {
      return result;
    }
  }

  public collectPoolReward(
    position: Position,
    options: CollectPoolRewardOptions,
    tx: Transaction
  ): TransactionResult | void {
    invariant(
      !options.recipient || isValidSuiAddress(options.recipient),
      'RECIPIENT'
    );

    const result = tx.moveCall({
      target: `${
        PACKAGE_ID_MAPPING[this.network]
      }::${MODULE_POSITION_MANAGER}::decrease_liquidity`,
      typeArguments: [
        position.amountX.coin.coinType,
        position.amountY.coin.coinType,
        options.expectedRewardOwed.coin.coinType,
      ],
      arguments: [
        tx.object(POOL_REGISTRY_OBJECT_ID_MAPPING[this.network]),
        tx.object(position.id),
        tx.pure.u64(options.expectedRewardOwed.quotient.toString()),
        tx.object(VERSIONED_OBJECT_MAPPING[this.network]),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });

    if (options.recipient) {
      tx.transferObjects([result[0]], options.recipient);
    } else {
      return result;
    }
  }
}
