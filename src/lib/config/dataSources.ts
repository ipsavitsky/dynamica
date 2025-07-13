import { getMarketDataSource } from './markets';

export type DataSourceType = 'fixture' | 'coingecko' | 'custom';

export interface DataSourceConfig {
  type: DataSourceType;
  name: string;
  description: string;
  config?: Record<string, any>;
}

export interface CoinGeckoConfig {
  assets: string[]; // CoinGecko asset IDs (e.g., ['bitcoin', 'ethereum'])
  days: number; // Number of days to fetch
  vsCurrency: string; // Currency to compare against (default: 'usd')
}

export interface FixtureConfig {
  dataType: string; // 'drivers' | 'crypto'
  customData?: string; // Optional custom CSV data
  dataLimiter?: number; // Optional data limiter
}

export interface CustomConfig {
  endpoint: string;
  headers?: Record<string, string>;
  transform?: (data: any) => any;
}

// Data source configurations
export const DATA_SOURCES: Record<string, DataSourceConfig> = {
  'drivers': {
    type: 'fixture',
    name: 'Formula 1 Drivers',
    description: 'Historical Formula 1 driver performance data',
    config: {
      dataType: 'drivers'
    } as FixtureConfig
  },
  'crypto-fixture': {
    type: 'fixture',
    name: 'Cryptocurrency (Fixture)',
    description: 'Mock cryptocurrency data for testing',
    config: {
      dataType: 'crypto'
    } as FixtureConfig
  },
  'crypto-coingecko': {
    type: 'coingecko',
    name: 'Cryptocurrency (CoinGecko)',
    description: 'Real-time cryptocurrency data from CoinGecko',
    config: {
      assets: ['ethereum', 'bitcoin'],
      days: 30,
      vsCurrency: 'usd'
    } as CoinGeckoConfig
  },
  'crypto-coingecko-eth-btc': {
    type: 'coingecko',
    name: 'ETH vs BTC',
    description: 'Ethereum vs Bitcoin market data',
    config: {
      assets: ['ethereum', 'bitcoin'],
      days: 30,
      vsCurrency: 'usd'
    } as CoinGeckoConfig
  },
  'crypto-coingecko-top-5': {
    type: 'coingecko',
    name: 'Top 5 Cryptocurrencies',
    description: 'Top 5 cryptocurrencies by market cap',
    config: {
      assets: ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano'],
      days: 30,
      vsCurrency: 'usd'
    } as CoinGeckoConfig
  },
  'crypto-coingecko-defi': {
    type: 'coingecko',
    name: 'DeFi Tokens',
    description: 'Major DeFi protocol tokens',
    config: {
      assets: ['uniswap', 'aave', 'compound', 'curve-dao-token', 'synthetix-network-token'],
      days: 30,
      vsCurrency: 'usd'
    } as CoinGeckoConfig
  },
  'crypto-coingecko-meme': {
    type: 'coingecko',
    name: 'Meme Coins',
    description: 'Popular meme cryptocurrency tokens',
    config: {
      assets: ['dogecoin', 'shiba-inu', 'pepe', 'bonk', 'floki'],
      days: 30,
      vsCurrency: 'usd'
    } as CoinGeckoConfig
  }
};

export function getDataSourceConfig(dataSourceId: string): DataSourceConfig | null {
  return DATA_SOURCES[dataSourceId] || null;
}

export function getDataSourceForMarket(chainId: number, marketId: string): DataSourceConfig | null {
  // Get the data source ID from the market configuration
  const dataSourceId = getMarketDataSource(chainId, marketId);
  if (!dataSourceId) return null;
  
  // Get the data source configuration
  return getDataSourceConfig(dataSourceId);
}

export function isCoinGeckoDataSource(dataSource: DataSourceConfig): boolean {
  return dataSource.type === 'coingecko';
}

export function isFixtureDataSource(dataSource: DataSourceConfig): boolean {
  return dataSource.type === 'fixture';
}

export function getCoinGeckoConfig(dataSource: DataSourceConfig): CoinGeckoConfig | null {
  if (!isCoinGeckoDataSource(dataSource)) return null;
  return dataSource.config as CoinGeckoConfig;
}

export function getFixtureConfig(dataSource: DataSourceConfig): FixtureConfig | null {
  if (!isFixtureDataSource(dataSource)) return null;
  return dataSource.config as FixtureConfig;
} 