import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { driverPoints, cryptoPrices } from '$lib/fixtures';

// In-memory storage for demo configuration
let demoConfig = {
  driverPoints: {
    enabled: true,
    customData: null as string | null,
    dataLimiter: -1 // -1 means no limit, otherwise max row index accessible
  },
  cryptoPrices: {
    enabled: true,
    customData: null as string | null,
    dataLimiter: -1 // -1 means no limit, otherwise max row index accessible
  }
};

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

// Apply data limiter to restrict accessible rows
function applyDataLimiter(data: string, limiter: number) {
  if (limiter === -1) {
    return data; // No limit
  }
  const lines = data.trim().split('\n');
  const maxRows = Math.min(limiter + 1, lines.length - 1); // +1 because limiter is 0-based
  return lines.slice(0, maxRows + 1).join('\n'); // +1 to include headers
}

export async function GET({ url }: RequestEvent) {
  const searchParams = url.searchParams;
  const type = searchParams.get('type'); // 'drivers' or 'crypto'
  const latest = searchParams.get('latest'); // 'true' to get latest row
  const timestamp = searchParams.get('timestamp'); // future: timestamp filtering
  const id = searchParams.get('id'); // future: ID filtering

  let result;
  
  if (type === 'drivers') {
    if (!demoConfig.driverPoints.enabled) {
      return json({ error: 'Driver data is disabled' }, { status: 400 });
    }
    
    let data = demoConfig.driverPoints.customData || driverPoints;
    
    // Apply data limiter first
    data = applyDataLimiter(data, demoConfig.driverPoints.dataLimiter);
    
    if (latest === 'true') {
      // Get only the latest row
      const latestData = getLatestRow(data);
      result = parseData(latestData);
    } else {
      // Get all accessible data
      result = parseData(data);
    }
  } else if (type === 'crypto') {
    if (!demoConfig.cryptoPrices.enabled) {
      return json({ error: 'Crypto data is disabled' }, { status: 400 });
    }
    
    let data = demoConfig.cryptoPrices.customData || cryptoPrices;
    
    // Apply data limiter first
    data = applyDataLimiter(data, demoConfig.cryptoPrices.dataLimiter);
    
    if (latest === 'true') {
      // Get only the latest row
      const latestData = getLatestRow(data);
      result = parseData(latestData);
    } else {
      // Get all accessible data
      result = parseData(data);
    }
  } else {
    // Return both datasets
    let driverData = null;
    let cryptoData = null;
    
    if (demoConfig.driverPoints.enabled) {
      let data = demoConfig.driverPoints.customData || driverPoints;
      data = applyDataLimiter(data, demoConfig.driverPoints.dataLimiter);
      
      if (latest === 'true') {
        driverData = parseData(getLatestRow(data));
      } else {
        driverData = parseData(data);
      }
    }
    
    if (demoConfig.cryptoPrices.enabled) {
      let data = demoConfig.cryptoPrices.customData || cryptoPrices;
      data = applyDataLimiter(data, demoConfig.cryptoPrices.dataLimiter);
      
      if (latest === 'true') {
        cryptoData = parseData(getLatestRow(data));
      } else {
        cryptoData = parseData(data);
      }
    }
    
    result = {
      drivers: driverData,
      crypto: cryptoData
    };
  }

  return json(result);
}

export async function POST({ request }: RequestEvent) {
  const body = await request.json();
  
  // Update demo configuration
  if (body.driverPoints) {
    demoConfig.driverPoints = { ...demoConfig.driverPoints, ...body.driverPoints };
  }
  if (body.cryptoPrices) {
    demoConfig.cryptoPrices = { ...demoConfig.cryptoPrices, ...body.cryptoPrices };
  }
  
  return json({ success: true, config: demoConfig });
}

export async function PUT({ request }: RequestEvent) {
  const body = await request.json();
  
  // Reset to default configuration
  if (body.reset === true) {
    demoConfig = {
      driverPoints: {
        enabled: true,
        customData: null,
        dataLimiter: -1
      },
      cryptoPrices: {
        enabled: true,
        customData: null,
        dataLimiter: -1
      }
    };
  }
  
  return json({ success: true, config: demoConfig });
} 