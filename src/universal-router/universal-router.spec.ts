import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import {
  AggregatorQuoter,
  CONFIGS,
  Commission,
  CommissionType,
  MODULE_UNIVERSAL_ROUTER,
  Protocol,
  TradeBuilder,
} from './index';
import { SUI_TYPE_ARG, normalizeStructTag } from '@mysten/sui/utils';
import { ADDRESS_ZERO, Coin } from '../core';
import BigNumber from 'bignumber.js';

describe('UniversalRouter', () => {
  it('should work without commission', async () => {
    const client = new SuiClient({ url: getFullnodeUrl('mainnet') });
    const input = {
      sender: ADDRESS_ZERO,
      tokenIn:
        '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      tokenOut: normalizeStructTag(SUI_TYPE_ARG),
      amountIn: '10000000',
    };

    for (const protocol of Object.values(Protocol)) {
      const quoter = new AggregatorQuoter('mainnet');
      const result = await quoter.getRoutes({
        ...input,
        includeSources: [protocol].filter((item) => !!item),
      });
      const tradeBuilder = new TradeBuilder('mainnet', result.routes);
      const tradeTx = await tradeBuilder
        .sender(input.sender)
        .build()
        .buildTransaction({ client });

      const resp = await client.devInspectTransactionBlock({
        transactionBlock: tradeTx,
        sender: input.sender,
      });

      if (resp.effects.status.status !== 'success') {
        console.dir(resp, { depth: 10 });
      }

      expect(resp.effects.status.status === 'success').toBeTruthy();

      const amountOut: string = (
        resp.events.find(
          (event) =>
            event.type ===
            `${CONFIGS['mainnet'].packageId}::${MODULE_UNIVERSAL_ROUTER}::Swap`
        )?.parsedJson as any
      )?.amount_out;

      const lt = new BigNumber(amountOut).lt(
        new BigNumber(result.amountOut.toString()).multipliedBy(1.1)
      );
      const gt = new BigNumber(amountOut).gt(
        new BigNumber(result.amountOut.toString()).multipliedBy(0.9)
      );

      expect(lt && gt).toBeTruthy();
    }
  });

  it('should work with commission', async () => {
    const client = new SuiClient({ url: getFullnodeUrl('mainnet') });
    const input = {
      sender: ADDRESS_ZERO,
      tokenIn:
        '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      tokenOut: normalizeStructTag(SUI_TYPE_ARG),
      amountIn: '10000000',
      commission: new Commission(
        ADDRESS_ZERO,
        new Coin(SUI_TYPE_ARG),
        CommissionType.PERCENTAGE,
        1000
      ),
    };

    for (const protocol of Object.values(Protocol)) {
      const quoter = new AggregatorQuoter('mainnet');
      const result = await quoter.getRoutes({
        ...input,
        includeSources: [protocol],
      });
      const tradeBuilder = new TradeBuilder('mainnet', result.routes);
      const tradeTx = await tradeBuilder
        .sender(input.sender)
        .build()
        .buildTransaction({ client });

      const resp = await client.devInspectTransactionBlock({
        transactionBlock: tradeTx,
        sender: input.sender,
      });

      expect(resp.effects.status.status === 'success').toBeTruthy();

      const amountOut: string = (
        resp.events.find(
          (event) =>
            event.type ===
            `${CONFIGS['mainnet'].packageId}::${MODULE_UNIVERSAL_ROUTER}::Swap`
        )?.parsedJson as any
      )?.amount_out;

      const lt = new BigNumber(amountOut).lt(
        new BigNumber(result.amountOut.toString()).multipliedBy(1.1)
      );
      const gt = new BigNumber(amountOut).gt(
        new BigNumber(result.amountOut.toString()).multipliedBy(0.9)
      );

      expect(lt && gt).toBeTruthy();
    }
  });
});
