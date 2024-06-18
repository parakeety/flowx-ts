# Official FlowX Finance TypeScript SDK for Sui

An FlowX Typescript SDK is a software development kit that allows developers to interact with FlowX protocols using the Typescript programming language.

# Features
- Retrieve coin
- Retrieve transaction block liquidity management V2 (add,remove)
- Retrieve transaction block for swap aggregator

# Getting Started

```
npm i @flowx-finance/sdk
```


## Retrieve coin
Get instance of `Coin[]` 

```typescript
const coins = await coinProvider.getCoins({
  coinTypes: ['0x2::sui::SUI'],
});
```

## Swap Aggregator
### Get Swap Route
To find best route for swap

``` typescript
const quoter = new AggregatorQuoter('mainnet');
const params: AggregatorQuoterQueryParams = {
  tokenIn: '0x2::sui::SUI',
  tokenOut: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
  amountIn: '1000000000',
  includeSources?: null, //optional
  excludeSources?: null, //optional
  commission?: null //optional, and will be explain later
};

const routes = await quoter.getRoutes(params);
```

**Use function getRoutes in instance AggregatorQuoter with it's arguments to create a Route**

| Arguments    | Description                                           | Type     | Example                                   |
|--------------|-------------------------------------------------------|----------|-------------------------------------------|
| `tokenIn`    | Token to be swapped from                              | string   | '0x2::sui::SUI'                           |
| `tokenOut`   | Token to be received                                  | string   | '0x5d....f::coin::COIN' |
| `amountIn`   | Amount of `tokenIn` to be swapped                     | string   | '1000000000'                              |
| `includeSources` | Optional: Sources to include in aggregation        | null \| Protocol[] | null                                      |
| `excludeSources` | Optional: Sources to exclude in aggregation        | null \| Protocol[] | null                                      |
| `commission` | Optional: Commission amount for the transaction, use when you want calculate commission with partner fee        | null \| Commission | null                                      |
        
### Build Transaction for aggregator swap
Build transaction that you can use with SuiClient or Dapp-kit


```typescript
const tradeBuilder = new TradeBuilder(NETWORK.MAINNET, routes); //routes get from quoter
const trade = tradeBuilder
  .sender('0xSenderAddress')
  .amountIn('1000000000')
  .amountOut('500000000000000000') // Estimate amount out, usual get from quoter
  .slippage(1/100 * 1e6) // Slippage 1%
  .deadline(Date.now() + 3600) // 1 hour from now
  .commission(null) // Commission will be explain later
  .build();
console.log(trade); // Output: Trade object with configured parameters
```

### Find route and build transaction with commission

The `Commission` class represents a commission configuration for transactions, defining the partner, commission type, and value. It includes methods for computing the commission amount based on the specified type.


``` typescript
const commission = new Commission('0xPartnerAddress', new Coin('0x2::sui:SUI'), CommissionType.PERCENTAGE, '500');
```
if `CommissionType.PERCENTAGE` then `value` should be input `1/100 * 1e6` it is example of 1%
if `CommissionType.FLAT` then `value` should be the amount of token you want to fee include decimals
Then you should pass `commission` variable to both `tradeBuilder` and `getRoutes` for exact values

## Liquidity V2
### Add liquidity for AMM (V2)

To create new instance AddLiquidityV2

``` typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { AddLiqudidityV2 } from "@flowx-pkg/ts-sdk"

const network = "mainnet"
const suiClient = new SuiClient({ url: getFullnodeUrl(network) })

const addLiquidityV2 = new AddLiqudidityV2(network, suiClient)
```

**Use function buildTransaction in instance addLiquidityV2 with it's arguments to create a Transaction**

| Arguments       | Description                      | Type                 | Example                         |
| --------------- | -------------------------------- | -------------------- | ------------------------------- |
| `coinType`      | Coin types                       | IBothCoins\<string\> | { x: "suiType", y: "usdcType" } |
| `amount`        | Amount of token to deposit       | IBothCoins\<string\> | { x: "1000000", y: "200000" }   |
| `senderAddress` | Sender address                   | string               |                                 |
| `slippage`      | Slippage percent (Ex: 1% = 0.01) | number               | 0.001                           |

### Remove liquidity for AMM (V2)

**To create new instance RemoveLiquidityV2**

``` typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { RemoveLiqudidityV2 } from "@flowx-pkg/ts-sdk"

const network = "mainnet"
const suiClient = new SuiClient({ url: getFullnodeUrl(network) })

const removeLiquidityV2 = new RemoveLiqudidityV2(network, suiClient)
```

**Use function buildTransaction in instance removeLiquidityV2 with it's arguments to create a Transaction**

| Arguments       | Description                            | Type                 | Example                         |
| --------------- | -------------------------------------- | -------------------- | ------------------------------- |
| `pairLpType`    | PairLpType                             | string               |                                 |
| `pairLpAmount`  | Total amount pair of token to withdraw | string               | 100000                          |
| `coinType`      | Coin types                             | IBothCoins\<string\> | { x: "suiType", y: "usdcType" } |
| `amount`        | Amount of token to withdraw            | IBothCoins\<string\> | { x: "1000000", y: "200000" }   |
| `senderAddress` | Sender address                         | string               |                                 |
| `slippage`      | Slippage percent (Ex: 1% = 0.01)       | number               | 0.001                           |

