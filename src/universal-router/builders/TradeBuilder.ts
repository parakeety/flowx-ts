import { BN } from 'bn.js';
import {
  ADDRESS_ZERO,
  BigintIsh,
  Coin,
  NETWORK,
  ZERO,
  sumBn,
} from '../../core';
import { Commission } from '../entities/Commission';
import { Route } from '../entities/Route';
import invariant from 'tiny-invariant';
import { Trade } from '../entities/Trade';
import { BPS } from '../constants';

export class TradeBuilder<CInput extends Coin, COutput extends Coin> {
  private _network!: NETWORK;
  private _sender!: string;
  private _amountIn!: BigintIsh;
  private _amountOut!: BigintIsh;
  private _slippage!: number;
  private _deadline!: number;
  private _routes!: Route<CInput, COutput>[];
  private _commission: Commission | undefined;

  constructor(network: NETWORK, routes: Route<CInput, COutput>[]) {
    invariant(
      routes.length > 0 &&
        routes
          .slice(1)
          .every(
            (route) =>
              route.input.equals(routes[0].input) &&
              route.output.equals(routes[0].output)
          ),
      'ROUTES'
    );

    this._network = network;
    this._sender = ADDRESS_ZERO;
    this._routes = routes;
    this._amountIn = sumBn(routes.map((route) => new BN(route.amountIn)));
    this._amountOut = sumBn(routes.map((route) => new BN(route.amountOut)));
    this._slippage = 0;
    this._deadline = Number.MAX_SAFE_INTEGER;
  }

  public sender(sender: string): TradeBuilder<CInput, COutput> {
    this._sender = sender;
    return this;
  }

  public amountIn(amountIn: BigintIsh): TradeBuilder<CInput, COutput> {
    this._amountIn = amountIn;
    return this;
  }

  public amountOut(amountOut: BigintIsh): TradeBuilder<CInput, COutput> {
    this._amountOut = amountOut;
    return this;
  }

  public deadline(deadline: number): TradeBuilder<CInput, COutput> {
    this._deadline = deadline;
    return this;
  }

  public slippage(slippage: number): TradeBuilder<CInput, COutput> {
    this._slippage = slippage;
    return this;
  }

  public commission(commission: Commission): TradeBuilder<CInput, COutput> {
    this._commission = commission;
    return this;
  }

  public build(): Trade<CInput, COutput> {
    const amountsIn = this._routes.map((route) => new BN(route.amountIn));
    invariant(
      new BN(this._amountIn).gt(ZERO) &&
        (!this._commission ||
          this._commission.coin.equals(this._routes[0].output) ||
          new BN(this._amountIn).eq(
            sumBn(amountsIn).add(
              this._commission.computeCommissionAmount(this._amountIn)
            )
          )),
      'AMOUNT_IN'
    );
    invariant(new BN(this._amountOut).gt(ZERO), 'AMOUNT_OUT');
    invariant(new BN(this._slippage).lte(BPS), 'SLIPPAGE');

    return new Trade({
      network: this._network,
      sender: this._sender,
      amountIn: this._amountIn,
      amountOut: this._amountOut,
      slippage: this._slippage,
      deadline: this._deadline,
      routes: this._routes,
      commission: this._commission,
    });
  }
}
