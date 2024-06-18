import NodeCache from 'node-cache';

export const sdkCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });
