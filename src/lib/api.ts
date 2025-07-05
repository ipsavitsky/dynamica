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
    const url = new URL(this.baseUrl, window.location.origin);
    url.searchParams.set('type', 'crypto');
    if (latest) {
      url.searchParams.set('latest', 'true');
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch crypto data: ${response.statusText}`);
    }
    
    return await response.json();
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