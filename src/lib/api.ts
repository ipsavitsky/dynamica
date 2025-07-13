import { 
  fetchMultipleAssetPrices, 
  normalizeToDistribution, 
  convertToDataPoint 
} from './coingecko';
import { get } from 'svelte/store';
import { currentChainId } from './chainManager';
import { 
  getDataSourceForMarket, 
  isCoinGeckoDataSource, 
  isFixtureDataSource,
  getCoinGeckoConfig,
  getFixtureConfig,
  type DataSourceConfig
} from './config/dataSources';

export interface DataPoint {
  headers: string[];
  rows: number[][];
}

export interface ApiResponse {
  drivers?: DataPoint;
  crypto?: DataPoint;
}

export class DataService {
  private baseUrl = '/api/data';

  async getDriverData(latest?: boolean): Promise<DataPoint> {
    const url = new URL(this.baseUrl, window.location.origin);
    url.searchParams.set('type', 'drivers');
    if (latest) {
      url.searchParams.set('latest', 'true');
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch driver data: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async getCryptoData(latest?: boolean): Promise<DataPoint> {
    const chainId = get(currentChainId);
    const dataSource = getDataSourceForMarket(chainId, 'crypto');
    
    if (!dataSource) {
      console.warn(`No data source configured for chain ${chainId}, market crypto`);
      return { headers: [], rows: [] };
    }

    console.log(`Using data source: ${dataSource.name} (${dataSource.type}) for chain ${chainId}`);

    if (isCoinGeckoDataSource(dataSource)) {
      return await this.getDataFromCoinGecko(dataSource, latest);
    } else if (isFixtureDataSource(dataSource)) {
      return await this.getDataFromFixture(dataSource, latest);
    } else {
      console.error(`Unsupported data source type: ${dataSource.type}`);
      return { headers: [], rows: [] };
    }
  }

  private async getDataFromCoinGecko(dataSource: DataSourceConfig, latest?: boolean): Promise<DataPoint> {
    try {
      const config = getCoinGeckoConfig(dataSource);
      if (!config) {
        throw new Error('Invalid CoinGecko configuration');
      }

      const { assets, days: configDays, vsCurrency } = config;
      
      // Use fewer days if latest is requested
      const days = latest ? Math.min(configDays, 7) : configDays;
      
      console.log(`Fetching ${days} days of crypto data from CoinGecko for:`, assets);
      
      // Fetch prices for all assets
      const priceSeries = await fetchMultipleAssetPrices(assets, days);
      
      // Normalize to distribution
      const distribution = normalizeToDistribution(priceSeries);
      
      // Convert to DataPoint format
      const dataPoint = convertToDataPoint(distribution, assets);
      
      console.log('CoinGecko data converted:', {
        headers: dataPoint.headers,
        rowCount: dataPoint.rows.length,
        sampleRow: dataPoint.rows[0]
      });
      
      return dataPoint;
    } catch (error) {
      console.error('Error fetching crypto data from CoinGecko:', error);
      // Fallback to empty data with headers from config
      const config = getCoinGeckoConfig(dataSource);
      return {
        headers: config?.assets.map(id => id.toUpperCase()) || ['ETHEREUM', 'BITCOIN'],
        rows: []
      };
    }
  }

  private async getDataFromFixture(dataSource: DataSourceConfig, latest?: boolean): Promise<DataPoint> {
    try {
      const config = getFixtureConfig(dataSource);
      if (!config) {
        throw new Error('Invalid fixture configuration');
      }

      const url = new URL(this.baseUrl, window.location.origin);
      url.searchParams.set('type', config.dataType);
      if (latest) {
        url.searchParams.set('latest', 'true');
      }
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch fixture data: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching fixture data:', error);
      return { headers: [], rows: [] };
    }
  }

  async getAllData(latest?: boolean): Promise<ApiResponse> {
    const url = new URL(this.baseUrl, window.location.origin);
    if (latest) {
      url.searchParams.set('latest', 'true');
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async updateConfig(config: {
    driverPoints?: {
      enabled?: boolean;
      customData?: string;
      dataLimiter?: number;
    };
    cryptoPrices?: {
      enabled?: boolean;
      customData?: string;
      dataLimiter?: number;
    };
  }): Promise<{ success: boolean; config: any }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update config: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async resetConfig(): Promise<{ success: boolean; config: any }> {
    const response = await fetch(this.baseUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reset: true })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to reset config: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// Export a singleton instance
export const dataService = new DataService(); 