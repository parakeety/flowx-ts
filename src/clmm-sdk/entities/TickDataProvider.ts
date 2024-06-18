import { BigintIsh } from '../../core';

export interface TickDataProvider {
  getTick(index: number): Promise<{ liquidityNet: BigintIsh }>;
}
