import invariant from 'tiny-invariant';
import { ObjectId, Coin, Coin as Token, removeEmptyFields } from '../../core';
import { CONFIGS, CommissionType, BPS, Protocol } from '../constants';
import {
  GetRoutesResult,
  BaseQuoter,
  BaseQuoterQueryParams,
} from './BaseQuoter';
import { Commission, Route } from '../entities';
import {
  AftermathSwap,
  CetusSwap,
  DeepbookSwap,
  FlowxV2Swap,
  FlowxV3Swap,
  KriyaDexSwap,
  TurbosSwap,
} from '../entities/protocols';
import JsonBigInt from '../utils/JsonBigInt';
import { BN } from 'bn.js';

interface AggregatorQuoterQueryParams extends BaseQuoterQueryParams {
  includeSources?: Protocol[];
  excludeSources?: Protocol[];
  commission?: Commission;
}

interface AggregatorQuoterResponse {
  code: number;
  message: string;
  data: AggregatorQuoterResult;
  requestId: string;
}

interface AggregatorQuoterResult {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  amountInUsd: string;
  amountOutUsd: string;
  priceImpact: string;
  feeToken: string;
  feeAmount: string;
  paths: Path[][];
}

interface Path {
  poolId: string;
  source: string;
  sourceType: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  extra: Extra;
}

interface Extra {
  swapTimestampMs?: number;
  amountInUnused?: number;
  swapXToY: boolean;
  lotSize?: number;
  nextStateSqrtRatioX64?: string;
  nextStateLiquidity?: string;
  nextStateTickCurrent?: string;
  minSqrtPriceHasLiquidity?: string;
  maxSqrtPriceHasLiquidity?: string;
  fee?: number;
  feeDenominator?: number;
  lpCoinType?: string;
}

const AGGREGATOR_BPS = 10000;
export class AggregatorQuoter extends BaseQuoter<
  Coin,
  Coin,
  AggregatorQuoterQueryParams
> {
  private buildPath(path: Path) {
    switch (path.source) {
      case Protocol.FLOWX_V2:
        return new FlowxV2Swap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
        });
      case Protocol.FLOWX_V3:
        return new FlowxV3Swap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!path.extra?.swapXToY,
          poolFee: path.extra?.fee || '0',
          sqrtPriceX64Limit:
            path.extra?.nextStateSqrtRatioX64?.toString() || '0',
          maxSqrtPriceX64HasLiquidity:
            path.extra.maxSqrtPriceHasLiquidity?.toString() || '0',
          minSqrtPriceX64HasLiquidity:
            path.extra.minSqrtPriceHasLiquidity?.toString() || '0',
        });
      case Protocol.AFTERMATH:
        return new AftermathSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          lpCoinType: path.extra?.lpCoinType || '',
        });
      case Protocol.CETUS:
        return new CetusSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!path.extra?.swapXToY,
          sqrtPriceX64Limit:
            path.extra?.nextStateSqrtRatioX64?.toString() || '0',
          maxSqrtPriceX64HasLiquidity:
            path.extra.maxSqrtPriceHasLiquidity?.toString() || '0',
          minSqrtPriceX64HasLiquidity:
            path.extra.minSqrtPriceHasLiquidity?.toString() || '0',
        });
      case Protocol.DEEPBOOK:
        return new DeepbookSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!path.extra?.swapXToY,
          lotSize: path.extra?.lotSize || '0',
        });
      case Protocol.KRIYA_DEX:
        return new KriyaDexSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!path.extra?.swapXToY,
        });
      case Protocol.TURBOS_FIANCE:
        return new TurbosSwap({
          network: this.network,
          pool: new ObjectId(path.poolId),
          input: new Coin(path.tokenIn),
          output: new Coin(path.tokenOut),
          amountIn: path.amountIn.toString(),
          amountOut: path.amountOut.toString(),
          xForY: !!path.extra?.swapXToY,
          poolFee: path.extra?.fee || '0',
          sqrtPriceX64Limit:
            path.extra?.nextStateSqrtRatioX64?.toString() || '0',
          maxSqrtPriceX64HasLiquidity:
            path.extra.maxSqrtPriceHasLiquidity?.toString() || '0',
          minSqrtPriceX64HasLiquidity:
            path.extra.minSqrtPriceHasLiquidity?.toString() || '0',
        });
      default:
        throw new Error(`${path.source} protocol not supported yet`);
    }
  }

  async getRoutes(
    params: AggregatorQuoterQueryParams
  ): Promise<GetRoutesResult<Coin, Coin>> {
    const coinIn = new Coin(params.tokenIn);
    const coinOut = new Token(params.tokenOut);
    const queryParams: any = {
      tokenIn: coinIn.coinType,
      tokenOut: coinOut.coinType,
      amountIn: params.amountIn,
      includeSources: params.includeSources?.join(','),
      excludeSources: params.excludeSources?.join(','),
    };

    if (
      params.commission &&
      (params.commission.coin.equals(coinIn) ||
        params.commission.coin.equals(coinOut))
    ) {
      queryParams['feeToken'] = params.commission.coin.coinType;
      if (params.commission.type === CommissionType.PERCENTAGE) {
        queryParams['feeInBps'] = new BN(params.commission.value)
          .mul(new BN(AGGREGATOR_BPS))
          .div(BPS)
          .toString();
      } else {
        queryParams['feeAmount'] = params.commission.value.toString();
      }
    }

    const resp = await fetch(
      `${CONFIGS[this.network].quoter.baseURI}?` +
        new URLSearchParams(removeEmptyFields(queryParams)).toString(),
      {
        method: 'GET',
        signal: AbortSignal.timeout(
          CONFIGS[this.network].quoter.requestTimeout
        ),
      }
    );

    const data: AggregatorQuoterResponse = JsonBigInt.parse(await resp.text());
    invariant(data.code === 0, data.message);

    return {
      coinIn,
      coinOut,
      amountIn: data.data.amountIn,
      amountOut: data.data.amountOut,
      routes: data.data.paths.map(
        (paths) =>
          new Route(
            this.network,
            paths.map((path) => this.buildPath(path))
          )
      ),
    };
  }
}
