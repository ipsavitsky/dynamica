import { json } from "@sveltejs/kit";
import { driverPoints } from "$lib/fixtures";

export async function GET() {
  try {
    const lines = driverPoints.trim().split("\n");
    const latestRow = lines[lines.length - 1]
      .split(",")
      .map((val) => parseFloat(val));
    const scaledData = latestRow.map((val) =>
      Math.floor(val * Math.pow(10, 15)),
    );
    return json({ data: scaledData });
  } catch (error) {
    return json({ error: "Failed to process data" }, { status: 500 });
  }
}
