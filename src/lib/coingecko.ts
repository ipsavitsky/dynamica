export type PricePoint = {
  date: Date;
  value: number;
};

export type PriceSeries = {
  assetId: string;
  points: PricePoint[];
};

/**
 * Fetch historical prices for a single asset.
 */
export async function fetchAssetPrices(
  assetId: string,
  days: number = 30
): Promise<PriceSeries> {
  try {
    const url = new URL(`https://api.coingecko.com/api/v3/coins/${assetId}/market_chart`);
    url.searchParams.set('vs_currency', 'usd');
    url.searchParams.set('days', days.toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const prices = data.prices as [number, number][];
    const points: PricePoint[] = prices.map(([timestamp, price]) => ({
      date: new Date(timestamp),
      value: price,
    }));

    return { assetId, points };
  } catch (err) {
    console.error(`Error fetching prices for ${assetId}:`, err);
    return { assetId, points: [] };
  }
}

/**
 * Normalize multiple assets' prices into relative shares per timestamp.
 * Result: Map of assetId → [{ date, value (normalized) }]
 */
export function normalizeToDistribution(
  seriesList: PriceSeries[]
): Record<string, PricePoint[]> {
  if (seriesList.length === 0) return {};

  const numPoints = seriesList[0].points.length;
  const result: Record<string, PricePoint[]> = {};

  for (let i = 0; i < numPoints; i++) {
    // Sum prices at this timestamp across all assets
    const date = seriesList[0].points[i].date;
    const total = seriesList.reduce((sum, series) => {
      return sum + (series.points[i]?.value ?? 0);
    }, 0);

    // Normalize each asset's value at this timestamp
    for (const series of seriesList) {
      if (!result[series.assetId]) {
        result[series.assetId] = [];
      }

      const value = series.points[i]?.value ?? 0;
      result[series.assetId].push({
        date,
        value: total > 0 ? value / total : 0,
      });
    }
  }

  return result;
}

/**
 * Fetch multiple assets' prices in parallel.
 */
export async function fetchMultipleAssetPrices(
  assetIds: string[],
  days: number = 30
): Promise<PriceSeries[]> {
  const promises = assetIds.map(assetId => fetchAssetPrices(assetId, days));
  return Promise.all(promises);
}

/**
 * Get a list of supported cryptocurrency IDs from CoinGecko.
 */
export async function getSupportedCoins(): Promise<Array<{ id: string; symbol: string; name: string }>> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/coins/list');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error('Error fetching supported coins:', err);
    return [];
  }
}

/**
 * Search for coins by name or symbol.
 */
export async function searchCoins(query: string): Promise<Array<{ id: string; symbol: string; name: string }>> {
  try {
    const url = new URL('https://api.coingecko.com/api/v3/search');
    url.searchParams.set('query', query);
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.coins.map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name
    }));
  } catch (err) {
    console.error('Error searching coins:', err);
    return [];
  }
}

/**
 * Convert CoinGecko data to the expected DataPoint format for the market.
 */
export function convertToDataPoint(
  distribution: Record<string, PricePoint[]>,
  assetIds: string[]
): { headers: string[]; rows: number[][]; dates: Date[] } {
  if (Object.keys(distribution).length === 0) {
    return { headers: [], rows: [], dates: [] };
  }

  // Get all unique timestamps
  const firstAsset = Object.values(distribution)[0];
  const timestamps = firstAsset.map(point => point.date);

  // Create headers (asset names)
  const headers = assetIds.map(id => id.toUpperCase());

  // Create rows (one row per timestamp)
  const rows: number[][] = timestamps.map((timestamp, index) => {
    return assetIds.map(assetId => {
      const assetData = distribution[assetId];
      const point = assetData?.[index];
      return point ? point.value : 0;
    });
  });

  return { headers, rows, dates: timestamps };
} 