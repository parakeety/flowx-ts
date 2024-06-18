import {
  BigintIsh,
  Coin,
  MODULE_OPTION,
  NETWORK,
  Percent,
  STD_PACKAGE_ID,
} from '../../core';
import { Route } from './Route';
import { Commission } from './Commission';
import { Transaction } from '@mysten/sui/transactions';
import {
  BPS,
  CONFIGS,
  MODULE_COMMISSION,
  MODULE_UNIVERSAL_ROUTER,
} from '../constants';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import { SuiClient } from '@mysten/sui/client';
import { bcs } from '@mysten/sui/bcs';

export interface TradeOptions<CInput extends Coin, COutput extends Coin> {
  network: NETWORK;
  sender: string;
  amountIn: BigintIsh;
  amountOut: BigintIsh;
  slippage: number;
  deadline: number;
  routes: Route<CInput, COutput>[];
  commission?: Commission;
}

export class Trade<CInput extends Coin, COutput extends Coin> {
  public readonly network!: NETWORK;
  public readonly sender!: string;
  public readonly input!: CInput;
  public readonly output!: COutput;
  public readonly amountIn!: BigintIsh;
  public readonly amountOut!: BigintIsh;
  public readonly slippage!: number;
  public readonly deadline!: number;
  public readonly routes!: Route<CInput, COutput>[];
  public readonly commission: Commission | undefined;

  constructor(options: TradeOptions<CInput, COutput>) {
    this.network = options.network;
    this.sender = options.sender;
    this.input = options.routes[0].input;
    this.output = options.routes[0].output;
    this.amountIn = options.amountIn;
    this.amountOut = options.amountOut;
    this.slippage = options.slippage;
    this.deadline = options.deadline;
    this.routes = options.routes;
    this.commission = options.commission;
  }

  public async buildTransaction(params: {
    client: SuiClient;
  }): Promise<Transaction> {
    const tx = new Transaction();

    // Take coin in from sender
    const coinIn = await this.input.take({
      owner: this.sender,
      amount: this.amountIn,
      tx,
      client: params.client,
    });

    //Initialize commission object if necessary
    let commissionOpt;
    if (
      !!this.commission &&
      (this.commission.coin.equals(this.input) ||
        this.commission.coin.equals(this.output))
    ) {
      const commissionObject = tx.moveCall({
        target: `${CONFIGS[this.network].packageId}::${MODULE_COMMISSION}::new`,
        arguments: [
          tx.pure.address(this.commission.partner),
          tx.pure.u8(this.commission.type),
          tx.pure.u64(this.commission.value.toString()),
          tx.pure.bool(this.commission.coin.equals(this.input)),
        ],
      });
      commissionOpt = tx.moveCall({
        target: `${STD_PACKAGE_ID}::${MODULE_OPTION}::some`,
        typeArguments: [
          `${
            CONFIGS[this.network].packageId
          }::${MODULE_COMMISSION}::Commission`,
        ],
        arguments: [commissionObject],
      });
    } else {
      commissionOpt = tx.moveCall({
        target: `${STD_PACKAGE_ID}::${MODULE_OPTION}::none`,
        typeArguments: [
          `${
            CONFIGS[this.network].packageId
          }::${MODULE_COMMISSION}::Commission`,
        ],
      });
    }

    // Perform build trade object
    const tradeObject = tx.moveCall({
      target: `${
        CONFIGS[this.network].packageId
      }::${MODULE_UNIVERSAL_ROUTER}::build`,
      typeArguments: [this.input.coinType, this.output.coinType],
      arguments: [
        tx.object(CONFIGS[this.network].tradeIdTrackerObjectId),
        tx.object(CONFIGS[this.network].partnerRegistryObjectId),
        coinIn,
        tx.pure.u64(this.amountOut.toString()),
        tx.pure.u64(this.slippage),
        tx.pure.u64(this.deadline),
        tx.pure(
          bcs
            .vector(bcs.U64)
            .serialize(this.routes.map((route) => route.amountIn.toString()))
        ),
        commissionOpt,
      ],
    });

    //Perform swap for each route
    for (const route of this.routes) {
      route.swap(tradeObject, new Percent(this.slippage, BPS), tx);
    }

    //Perform settle move call and transfer coin out to sender
    const coinOut = tx.moveCall({
      target: `${
        CONFIGS[this.network].packageId
      }::${MODULE_UNIVERSAL_ROUTER}::settle`,
      typeArguments: [this.input.coinType, this.output.coinType],
      arguments: [
        tx.object(CONFIGS[this.network].treasuryObjectId),
        tx.object(CONFIGS[this.network].partnerRegistryObjectId),
        tradeObject,
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
    tx.transferObjects([coinOut], this.sender);

    return tx;
  }
}
