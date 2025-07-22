import {
  fetchMultipleAssetPrices,
  normalizeToDistribution,
  convertToDataPoint,
} from "./coingecko";
import { get } from "svelte/store";
import { currentChainId } from "./chainManager";
import {
  getDataSourceForMarket,
  isCoinGeckoDataSource,
  getCoinGeckoConfig,
} from "./config/dataSources";

export interface DataPoint {
  headers: string[];
  rows: number[][];
  dates?: Date[];
}

class DataService {
  private async fetchData(type: string, latest?: boolean): Promise<DataPoint> {
    const url = new URL("/api/data", window.location.origin);
    url.searchParams.set("type", type);
    if (latest) url.searchParams.set("latest", "true");
    const response = await fetch(url.toString());
    if (!response.ok)
      throw new Error(`Failed to fetch ${type} data: ${response.statusText}`);
    return await response.json();
  }

  async getDriverData(latest?: boolean) {
    return this.fetchData("drivers", latest);
  }

  async getCryptoData(latest?: boolean): Promise<DataPoint> {
    const dataSource = getDataSourceForMarket(get(currentChainId), "crypto");
    if (!dataSource) return { headers: [], rows: [] };

    if (isCoinGeckoDataSource(dataSource)) {
      const config = getCoinGeckoConfig(dataSource);
      if (!config) return { headers: [], rows: [] };

      try {
        const days = latest
          ? Math.min(config.days || 30, 7)
          : config.days || 30;
        const priceSeries = await fetchMultipleAssetPrices(
          config.assets || [],
          days,
        );
        const distribution = normalizeToDistribution(priceSeries);
        return convertToDataPoint(distribution, config.assets || []);
      } catch (error) {
        console.error("Error fetching crypto data from CoinGecko:", error);
        return {
          headers: config.assets?.map((id) => id.toUpperCase()) || [
            "ETHEREUM",
            "BITCOIN",
          ],
          rows: [],
          dates: [],
        };
      }
    }

    return this.fetchData("crypto", latest);
  }

  async updateConfig(config: any) {
    const response = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!response.ok)
      throw new Error(`Failed to update config: ${response.statusText}`);
    return await response.json();
  }

  async resetConfig() {
    const response = await fetch("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true }),
    });
    if (!response.ok)
      throw new Error(`Failed to reset config: ${response.statusText}`);
    return await response.json();
  }
}

export const dataService = new DataService();
