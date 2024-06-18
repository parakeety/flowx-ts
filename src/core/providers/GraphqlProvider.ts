import { GraphQLClient } from 'graphql-request';
import { RequestConfig } from 'graphql-request/build/esm/types';
import { CONFIGS } from '../../universal-router';

export class GraphqlProvider {
  public readonly client!: GraphQLClient;

  constructor(network: 'mainnet', config?: RequestConfig) {
    this.client = new GraphQLClient(CONFIGS[network].graphql.baseURI, config);
  }
}
