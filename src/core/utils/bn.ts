import BN from 'bn.js';
import { ZERO } from '../constants';

export function sumBn(bigNumbers: BN[]): BN {
  return bigNumbers.reduce((memo, bn) => memo.add(bn), ZERO);
}
