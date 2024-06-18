/**
 * The default enabled fee amounts, denominated in hundredths of bips.
 */
export enum FeeAmount {
  LOWEST = 100,
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

/**
 * The default tick spacings by fee amount.
 */
export const TICK_SPACINGS: { [amount in FeeAmount]: number } = {
  [FeeAmount.LOWEST]: 2,
  [FeeAmount.LOW]: 10,
  [FeeAmount.MEDIUM]: 60,
  [FeeAmount.HIGH]: 200,
};

export const PACKAGE_ID_MAPPING = {
  mainnet: '',
  testnet: '',
};

export const POOL_REGISTRY_OBJECT_ID_MAPPING = {
  mainnet: '',
  testnet: '',
};

export const POSITION_REGISTRY_OBJECT_ID_MAPPING = {
  mainnet: '',
  testnet: '',
};

export const VERSIONED_OBJECT_MAPPING = {
  mainnet: '',
  testnet: '',
};

export const MODULE_POOL_MANAGER = 'pool_manager';

export const MODULE_POSITION_MANAGER = 'position_manager';

export const MODULE_I32 = 'i32';
