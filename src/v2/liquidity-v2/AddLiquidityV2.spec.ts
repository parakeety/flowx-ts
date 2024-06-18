import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { AddLiquidityV2 } from './AddLiquidityV2';

describe('AddLiquidityV2', () => {
  const network = 'testnet';
  const suiClient = new SuiClient({
    url: getFullnodeUrl(network),
  });

  const addLiquidityV2 = new AddLiquidityV2(network, suiClient);
  const sender = `0xa52b3f2e8b3f0dac377f753eeade7f7c6b329a97c227425a59b91c1e2f8dff2c`;

  it('buildTransaction should work', async () => {
    const tx = await addLiquidityV2.buildTransaction(
      {
        x: '0x2::sui::SUI',
        y: '0xea10912247c015ead590e481ae8545ff1518492dee41d6d03abdad828c1d2bde::usdc::USDC',
      },
      {
        x: '1000000000',
        y: '1000000',
      },
      sender,
      1
    );

    const resp = await suiClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender,
    });

    expect(resp.effects.status.status === 'success').toBeTruthy();
  });
});
