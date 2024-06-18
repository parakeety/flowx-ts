import { sort } from 'd3';
import { Coin } from '../entities';
import { Pagination } from '../types/Pagination';
import { Sortation } from '../types/Sortation';
import { GraphqlProvider } from './GraphqlProvider';
import { queryCoins } from './graphql/queryCoins';
import { standardShortCoinType } from '../utils/standardShortCoinType';
import { sdkCache } from '../cache';
import _ from 'lodash';
import CryptoJS from 'crypto-js';

export type CoinFilter = {
  isVerified?: boolean;
  coinTypes?: string[];
  searchKey?: string;
} & Pagination &
  Sortation;

export interface ICoinProvider {
  getCoins(filter: CoinFilter): Promise<Coin[] | undefined>;
}

export class CoinProvider implements ICoinProvider {
  public readonly graphqlProvider!: GraphqlProvider;

  constructor(network: 'mainnet') {
    this.graphqlProvider = new GraphqlProvider(network);
  }

  async getCoins(filter?: CoinFilter): Promise<Coin[] | undefined> {
    const variables = {
      size: filter?.limit ?? 10,
      page: filter?.page ?? 1,
      isVerified: filter?.isVerified,
      coinTypes: filter?.coinTypes?.map((type) => standardShortCoinType(type)),
      sortBy: filter?.sortBy ?? 'createdAt',
      sortDirection: filter?.sortDirection ?? 'asc',
      searchKey: filter?.searchKey,
    };
    const key = `QUERY_COIN ${CryptoJS.MD5(
      JSON.stringify(_.values(variables))
    )}`;

    let response = sdkCache.get(key);

    if (!response) {
      response = await this.graphqlProvider.client.request(queryCoins, {
        size: filter?.limit ?? 10,
        page: filter?.page ?? 1,
        isVerified: filter?.isVerified,
        coinTypes: filter?.coinTypes?.map((type) =>
          standardShortCoinType(type)
        ),
        sortBy: filter?.sortBy ?? 'createdAt',
        sortDirection: filter?.sortDirection ?? 'asc',
        searchKey: filter?.searchKey,
      });

      sdkCache.set(
        `QUERY_COIN ${CryptoJS.MD5(JSON.stringify(_.values(variables)))}`,
        response
      );
    }

    const listCoins: Coin[] = [];
    (response as any).queryCoins.items.map((it: any) => {
      listCoins.push(
        new Coin(
          it.type,
          it.decimals,
          it.symbol,
          it.name,
          it.description,
          it.iconUrl,
          it.derivedPriceInUSD,
          it.derivedSUI,
          it.isVerified
        )
      );
    });

    return listCoins;
  }
}
