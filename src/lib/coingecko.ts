interface PricePoint {
  date: Date;
  value: number;
}
interface PriceSeries {
  assetId: string;
  points: PricePoint[];
}

const fetchAssetPrices = async (
  assetId: string,
  days = 30,
): Promise<PriceSeries> => {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${assetId}/market_chart?vs_currency=usd&days=${days}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    const points = data.prices.map(([timestamp, price]: [number, number]) => ({
      date: new Date(timestamp),
      value: price,
    }));
    return { assetId, points };
  } catch (err) {
    console.error(`Error fetching prices for ${assetId}:`, err);
    return { assetId, points: [] };
  }
};

export const normalizeToDistribution = (
  seriesList: PriceSeries[],
): Record<string, PricePoint[]> => {
  if (!seriesList.length) return {};
  const result: Record<string, PricePoint[]> = {};
  const numPoints = seriesList[0].points.length;

  for (let i = 0; i < numPoints; i++) {
    const date = seriesList[0].points[i].date;
    const total = seriesList.reduce(
      (sum, series) => sum + (series.points[i]?.value ?? 0),
      0,
    );

    for (const series of seriesList) {
      if (!result[series.assetId]) result[series.assetId] = [];
      const value = series.points[i]?.value ?? 0;
      result[series.assetId].push({
        date,
        value: total > 0 ? value / total : 0,
      });
    }
  }
  return result;
};

export const fetchMultipleAssetPrices = (assetIds: string[], days = 30) =>
  Promise.all(assetIds.map((id) => fetchAssetPrices(id, days)));

export const convertToDataPoint = (
  distribution: Record<string, PricePoint[]>,
  assetIds: string[],
) => {
  if (!Object.keys(distribution).length)
    return { headers: [], rows: [], dates: [] };
  const firstAsset = Object.values(distribution)[0];
  const timestamps = firstAsset.map((p) => p.date);
  const headers = assetIds.map((id) => id.toUpperCase());
  const rows = timestamps.map((_, index) =>
    assetIds.map((assetId) => distribution[assetId]?.[index]?.value ?? 0),
  );
  return { headers, rows, dates: timestamps };
};
