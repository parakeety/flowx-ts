export const standardShortCoinType = (hexString: string) => {
  return '0x' + hexString.replace('0x', '').replace(/^0+/, '');
};
