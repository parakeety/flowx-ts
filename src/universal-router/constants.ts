import { BN } from 'bn.js';

export const MODULE_UNIVERSAL_ROUTER = 'universal_router';

export const MODULE_COMMISSION = 'commission';

export enum Protocol {
  FLOWX_V2 = 'FLOWX',
  FLOWX_V3 = 'FLOWX_CLMM',
  KRIYA_DEX = 'KRIYA',
  TURBOS_FIANCE = 'TURBOS',
  CETUS = 'CETUS',
  AFTERMATH = 'AFTERMATH',
  DEEPBOOK = 'DEEPBOOK',
}

export enum CommissionType {
  PERCENTAGE,
  FLAT,
}

export const BPS = new BN(1_000_000);

export const CONFIGS = {
  mainnet: {
    packageId:
      '0x833a64724a500ad978480083c048ecc802fa5f6c59f622baf8b9531c3dfe8091',
    treasuryObjectId:
      '0x4695a48a2793dcf38d5f572e3388b675bea7fefdd1e0160d00f6625f10926359',
    tradeIdTrackerObjectId:
      '0x1efc1043577126103876562c35018ca4f799bde6553f936aa15af5af52962a28',
    partnerRegistryObjectId:
      '0x1a294f8e4d523ccb7d4b14dcc10f987de01925cd35e7a2d738518b82074835e2',
    protocols: {
      flowxV2: {
        containerObjectId:
          '0xb65dcbf63fd3ad5d0ebfbf334780dc9f785eff38a4459e37ab08fa79576ee511',
      },
      flowxV3: {
        poolRegistryObjectId:
          '0x27565d24a4cd51127ac90e4074a841bbe356cca7bf5759ddc14a975be1632abc',
        versionedObjectId:
          '0x67624a1533b5aff5d0dfcf5e598684350efd38134d2d245f475524c03a64e656',
      },
      cetus: {
        globalConfigObjectId:
          '0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f',
      },
      turbos: {
        packageId:
          '0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1',
        versionedObjectId:
          '0xf1cf0e81048df168ebeb1b8030fad24b3e0b53ae827c25053fff0779c1445b6f',
      },
      aftermath: {
        poolRegistryObjectId:
          '0xfcc774493db2c45c79f688f88d28023a3e7d98e4ee9f48bbf5c7990f651577ae',
        protocolFeeVaultObjectId:
          '0xf194d9b1bcad972e45a7dd67dd49b3ee1e3357a00a50850c52cd51bb450e13b4',
        treasuryObjectId:
          '0x28e499dff5e864a2eafe476269a4f5035f1c16f338da7be18b103499abf271ce',
        insuranceFundObjectId:
          '0xf0c40d67b078000e18032334c3325c47b9ec9f3d9ae4128be820d54663d14e3b',
        referralVaultOjectId:
          '0x35d35b0e5b177593d8c3a801462485572fc30861e6ce96a55af6dc4730709278',
      },
    },
    quoter: {
      baseURI: 'https://api.flowx.finance/flowx-ag-routing/api/v1/quote',
      requestTimeout: 30000,
    },
    graphql: {
      baseURI: 'https://api.flowx.finance/flowx-be/graphql',
    },
  },
};
