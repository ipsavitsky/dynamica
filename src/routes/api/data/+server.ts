import { json } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { driverPoints, cryptoPrices } from "$lib/fixtures";

let demoConfig = {
  driverPoints: {
    enabled: true,
    customData: null as string | null,
    dataLimiter: -1,
  },
  cryptoPrices: {
    enabled: true,
    customData: null as string | null,
    dataLimiter: -1,
  },
};

const parseData = (data: string) => {
  const lines = data.trim().split("\n");
  return {
    headers: lines[0].split(","),
    rows: lines
      .slice(1)
      .map((line) => line.split(",").map((val) => parseFloat(val))),
  };
};

const scaleDataForOracle = (values: number[]) =>
  values.map((val) => Math.floor(val * Math.pow(10, 15)));

const getLatestRow = (data: string) => {
  const lines = data.trim().split("\n");
  return lines.length <= 1
    ? data
    : lines.slice(0, 1).concat(lines.slice(-1)).join("\n");
};

const applyDataLimiter = (data: string, limiter: number) => {
  if (limiter === -1) return data;
  const lines = data.trim().split("\n");
  return lines.slice(0, Math.min(limiter + 1, lines.length - 1) + 1).join("\n");
};

export async function GET({ url }: RequestEvent) {
  const { type, latest, oracle } = Object.fromEntries(url.searchParams);

  const processData = (
    configKey: "driverPoints" | "cryptoPrices",
    defaultData: string,
  ) => {
    if (!demoConfig[configKey].enabled) return null;
    let data = demoConfig[configKey].customData || defaultData;
    data = applyDataLimiter(data, demoConfig[configKey].dataLimiter);
    return parseData(latest === "true" ? getLatestRow(data) : data);
  };

  let result;
  if (type === "drivers") result = processData("driverPoints", driverPoints);
  else if (type === "crypto")
    result = processData("cryptoPrices", cryptoPrices);
  else
    result = {
      drivers: processData("driverPoints", driverPoints),
      crypto: processData("cryptoPrices", cryptoPrices),
    };

  if (oracle === "true") {
    const allData: number[] = [];
    if (result && "drivers" in result && result.drivers?.rows?.length)
      allData.push(...result.drivers.rows[result.drivers.rows.length - 1]);
    if (result && "crypto" in result && result.crypto?.rows?.length)
      allData.push(...result.crypto.rows[result.crypto.rows.length - 1]);
    return allData.length
      ? json({ data: scaleDataForOracle(allData) })
      : json({ error: "No data available" }, { status: 404 });
  }

  return json(result);
}

export async function POST({ request }: RequestEvent) {
  const body = await request.json();
  if (body.driverPoints)
    demoConfig.driverPoints = {
      ...demoConfig.driverPoints,
      ...body.driverPoints,
    };
  if (body.cryptoPrices)
    demoConfig.cryptoPrices = {
      ...demoConfig.cryptoPrices,
      ...body.cryptoPrices,
    };
  return json({ success: true, config: demoConfig });
}

export async function PUT({ request }: RequestEvent) {
  const body = await request.json();
  if (body.reset)
    demoConfig = {
      driverPoints: { enabled: true, customData: null, dataLimiter: -1 },
      cryptoPrices: { enabled: true, customData: null, dataLimiter: -1 },
    };
  return json({ success: true, config: demoConfig });
}
