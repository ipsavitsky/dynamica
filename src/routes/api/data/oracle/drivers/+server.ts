import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { driverPoints } from '$lib/fixtures';

// Scale data by 10^15 for oracle format
function scaleDataForOracle(values: number[]): number[] {
  const SCALE_FACTOR = Math.pow(10, 15);
  return values.map(val => Math.floor(val * SCALE_FACTOR));
}

// Parse the CSV-like data
function parseData(data: string) {
  const lines = data.trim().split('\n');
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map(line => 
    line.split(',').map(val => parseFloat(val))
  );
  return { headers, rows };
}

// Get only the latest row
function getLatestRow(data: string) {
  const lines = data.trim().split('\n');
  if (lines.length <= 1) {
    return data; // Return headers only if no data
  }
  return lines.slice(0, 1).concat(lines.slice(-1)).join('\n');
}

export async function GET({ url }: RequestEvent) {
  try {
    // Get the latest row from driver data
    const latestData = getLatestRow(driverPoints);
    const result = parseData(latestData);
    
    if (result.rows && result.rows.length > 0) {
      const latestRow = result.rows[result.rows.length - 1]; // Get the latest row
      const scaledData = scaleDataForOracle(latestRow);
      return json({ data: scaledData });
    } else {
      return json({ error: 'No data available' }, { status: 404 });
    }
  } catch (error) {
    return json({ error: 'Failed to process data' }, { status: 500 });
  }
} 