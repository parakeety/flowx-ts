import invariant from 'tiny-invariant';
import { BasePool, BigintIsh, Coin, Price, Q64 } from '../../core';
import { TickDataProvider } from './TickDataProvider';
import { BN } from 'bn.js';
import { FeeAmount, TICK_SPACINGS } from '../constants';

export class Pool extends BasePool {
  public readonly fee!: FeeAmount;
  public readonly sqrtPriceX64!: BigintIsh;
  public readonly tickCurrent!: number;
  public readonly liquidity!: BigintIsh;
  public readonly tickDataProvider?: TickDataProvider | undefined;

  private _coinXPrice: Price<Coin, Coin>;
  private _coinYPrice: Price<Coin, Coin>;

  constructor(
    objectId: string,
    coins: Coin[],
    reserves: BigintIsh[],
    fee: FeeAmount,
    sqrtPriceX64: BigintIsh,
    tickCurrent: number,
    liquidity: BigintIsh,
    tickDataProvider?: TickDataProvider
  ) {
    invariant(coins.length === 2, 'COINS_LENGTH');

    coins = coins[0].sortsBefore(coins[1])
      ? [coins[0], coins[1]]
      : [coins[1], coins[0]];
    super(objectId, coins, reserves);

    this.fee = fee;
    this.sqrtPriceX64 = sqrtPriceX64;
    this.tickCurrent = tickCurrent;
    this.liquidity = liquidity;
    this.tickDataProvider = tickDataProvider;
  }

  public get coinXPrice(): Price<Coin, Coin> {
    return (
      this._coinXPrice ??
      (this._coinXPrice = new Price(
        this.coins[0],
        this.coins[1],
        Q64,
        new BN(this.sqrtPriceX64).mul(new BN(this.sqrtPriceX64))
      ))
    );
  }

  public get coinYPrice(): Price<Coin, Coin> {
    return (
      this._coinYPrice ??
      (this._coinYPrice = new Price(
        this.coins[1],
        this.coins[0],
        new BN(this.sqrtPriceX64).mul(new BN(this.sqrtPriceX64)),
        Q64
      ))
    );
  }

  public priceOf(coin: Coin): Price<Coin, Coin> {
    invariant(this.involvesCoin(coin), 'COIN');
    return coin.equals(this.coins[0]) ? this.coinXPrice : this.coinYPrice;
  }

  public get tickSpacing(): number {
    return TICK_SPACINGS[this.fee];
  }
}
