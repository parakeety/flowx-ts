import invariant from 'tiny-invariant';
import { BigintIsh, Coin, ZERO } from '../../core';
import { CommissionType, BPS } from '../constants';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { BN } from 'bn.js';

export class Commission {
  public readonly partner!: string;
  public readonly coin!: Coin;
  public readonly type!: CommissionType;
  public readonly value!: BigintIsh;

  constructor(
    partner: string,
    coin: Coin,
    type: CommissionType,
    value: BigintIsh
  ) {
    invariant(isValidSuiAddress(partner), 'PARTNER');
    invariant(
      type === CommissionType.FLAT ||
        (type === CommissionType.PERCENTAGE && value < BPS),
      'COMMISSION'
    );

    this.partner = partner;
    this.coin = coin;
    this.type = type;
    this.value = value;
  }

  public computeCommissionAmount(amountIn: BigintIsh) {
    switch (this.type) {
      case CommissionType.FLAT:
        return new BN(this.value);
      case CommissionType.PERCENTAGE:
        return new BN(amountIn).mul(new BN(this.value)).div(BPS);
      default:
        return ZERO;
    }
  }
}
