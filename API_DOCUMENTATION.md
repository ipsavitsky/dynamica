# Backend API Service Documentation

This document describes the new backend service that replaces the hardcoded fixtures with a configurable API.

## Overview

The backend service provides RESTful endpoints to serve driver points and crypto prices data with real-time configuration capabilities for demos.

## API Endpoints

### GET `/api/data`

Retrieves data based on query parameters.

**Query Parameters:**
- `type` (optional): `'drivers'` or `'crypto'` - specifies which dataset to return
- `latest` (optional): `'true'` - returns only the most recent row of data
- `timestamp` (optional): future feature for timestamp-based filtering
- `id` (optional): future feature for ID-based filtering

**Examples:**
```bash
# Get all accessible driver data (limited by dataLimiter)
GET /api/data?type=drivers

# Get only the latest driver data row
GET /api/data?type=drivers&latest=true

# Get all accessible crypto data (limited by dataLimiter)
GET /api/data?type=crypto

# Get only the latest crypto data row
GET /api/data?type=crypto&latest=true

# Get both datasets (all accessible data)
GET /api/data

# Get latest data from both datasets
GET /api/data?latest=true
```

**Response Format:**
```json
{
  "headers": ["Verstappen", "Norris", "Leclerc", "Piastri", "Sainz"],
  "rows": [
    [0.390625, 0.125, 0.1875, 0.0625, 0.234375],
    [0.4166666666666667, 0.1, 0.225, 0.13333333333333333, 0.125]
  ]
}
```

### POST `/api/data`

Updates the demo configuration.

**Request Body:**
```json
{
  "driverPoints": {
    "enabled": true,
    "customData": "Verstappen,Norris,Leclerc,Piastri,Sainz\n0.5,0.2,0.15,0.1,0.05",
    "dataLimiter": 10
  },
  "cryptoPrices": {
    "enabled": true,
    "customData": null,
    "dataLimiter": -1
  }
}
```

**Response:**
```json
{
  "success": true,
  "config": { /* current configuration */ }
}
```

### PUT `/api/data`

Resets configuration to defaults.

**Request Body:**
```json
{
  "reset": true
}
```

## Demo Configuration Panel

Visit `/demo-config` to access the interactive configuration panel that allows you to:

1. **Enable/Disable Data Sources**: Turn on/off driver or crypto data
2. **Data Limiter**: Control what's considered the "end" of the data for demo purposes
3. **Custom Data**: Override the default data with custom CSV-formatted data
4. **Test Endpoints**: Quickly test different API calls including latest row
5. **Real-time Preview**: See the current data being served

## Frontend Integration

Replace hardcoded fixture imports with the new API service:

```typescript
// Old way (hardcoded)
import { driverPoints, cryptoPrices } from '$lib/fixtures';

// New way (dynamic API)
import { dataService } from '$lib/api';

// Get all accessible driver data
const driverData = await dataService.getDriverData();

// Get latest driver data only
const latestDriverData = await dataService.getDriverData(true);

// Get all accessible crypto data
const cryptoData = await dataService.getCryptoData();

// Get latest crypto data only
const latestCryptoData = await dataService.getCryptoData(true);

// Get all accessible data
const allData = await dataService.getAllData();

// Get latest data from both sources
const latestAllData = await dataService.getAllData(true);
```

## Configuration Options

### Driver Points Configuration
- `enabled`: Enable/disable driver data
- `customData`: Custom CSV data to override defaults
- `dataLimiter`: Maximum accessible row index (-1 for no limit)

### Crypto Prices Configuration
- `enabled`: Enable/disable crypto data
- `customData`: Custom CSV data to override defaults
- `dataLimiter`: Maximum accessible row index (-1 for no limit)

## Demo Scenarios

### Scenario 1: Progressive Data Reveal
1. Set `dataLimiter` to 0 to show only the first data point
2. Gradually increase `dataLimiter` to reveal more data
3. Perfect for showing data progression over time

### Scenario 2: Latest Data Only
1. Use `latest=true` parameter to get only the most recent data point
2. Great for showing current state or real-time updates
3. Useful for dashboards showing latest values

### Scenario 3: Data Limiter for Demo Control
1. Set `dataLimiter` to 10 to make only first 11 rows accessible
2. Even if you request `latest=true`, you'll get row 10 (not the actual latest)
3. Perfect for controlling what data is "available" during demos

### Scenario 4: Custom Data Injection
1. Enter custom CSV data in the configuration panel
2. Use this to demonstrate different scenarios or edge cases
3. Data format: `header1,header2,header3\nvalue1,value2,value3`

### Scenario 5: Data Source Switching
1. Disable one data source (e.g., crypto)
2. Show how the application handles missing data
3. Re-enable to show recovery

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (e.g., disabled data source)
- `500`: Server error

## Data Format

The service expects CSV-like data with:
- First line: comma-separated headers
- Subsequent lines: comma-separated numeric values

Example:
```
Verstappen,Norris,Leclerc,Piastri,Sainz
0.390625,0.125,0.1875,0.0625,0.234375
0.4166666666666667,0.1,0.225,0.13333333333333333,0.125
```

## Future Enhancements

- Timestamp-based filtering
- ID-based data retrieval
- Real-time data streaming
- Data validation and sanitization
- Persistent configuration storage 