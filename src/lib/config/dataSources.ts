import { getMarketDataSource } from "./index";

export interface DataSourceConfig {
  type: "fixture" | "coingecko";
  name: string;
  config: {
    dataType?: string;
    assets?: string[];
    days?: number;
    vsCurrency?: string;
  };
}

const DATA_SOURCES: Record<string, DataSourceConfig> = {
  drivers: {
    type: "fixture",
    name: "Formula 1 Drivers",
    config: { dataType: "drivers" },
  },
  "crypto-coingecko-eth-btc": {
    type: "coingecko",
    name: "ETH vs BTC",
    config: { assets: ["ethereum", "bitcoin"], days: 30, vsCurrency: "usd" },
  },
};

export const getDataSourceConfig = (id: string) => DATA_SOURCES[id] || null;
export const getDataSourceForMarket = (chainId: number, marketId: string) => {
  const id = getMarketDataSource(chainId, marketId);
  return id ? getDataSourceConfig(id) : null;
};
export const isCoinGeckoDataSource = (ds: DataSourceConfig) =>
  ds.type === "coingecko";
export const isFixtureDataSource = (ds: DataSourceConfig) =>
  ds.type === "fixture";
export const getCoinGeckoConfig = (ds: DataSourceConfig) =>
  isCoinGeckoDataSource(ds) ? ds.config : null;
export const getFixtureConfig = (ds: DataSourceConfig) =>
  isFixtureDataSource(ds) ? ds.config : null;
