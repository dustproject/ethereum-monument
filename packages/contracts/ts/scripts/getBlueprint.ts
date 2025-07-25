import fs from "fs";
import path from "path";

interface BlueprintEntry {
  coord: [number, number, number];
  id: number;
  orientation: number;
}

interface IndexerResponse {
  block_height: number;
  result: Array<Array<string[]>>; // Nested array with string values
}

async function queryIndexer(sql: string): Promise<IndexerResponse> {
  const INDEXER_URL = process.env.INDEXER_URL || "https://indexer.mud.redstonechain.com/q";
  const CONTRACT_ADDRESS = process.env.WORLD_ADDRESS || "0x253eb85B3C953bFE3827CC14a151262482E7189C";

  const payload = [
    {
      address: CONTRACT_ADDRESS,
      query: sql,
    },
  ];

  console.log(`Querying indexer at ${INDEXER_URL} for contract ${CONTRACT_ADDRESS}`);

  const response = await fetch(INDEXER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Indexer query failed: ${response.statusText}`);
  }

  return response.json() as Promise<IndexerResponse>;
}

async function getBlueprint(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  outputPath: string,
) {
  // SQL query to join EntityPosition and EntityObjectType tables
  const sql = `SELECT "x", "y", "z", "objectType" FROM EntityObjectType, EntityPosition WHERE EntityObjectType."entityId" = EntityPosition."entityId" AND "x" >= ${x0} AND "x" <= ${x1} AND "y" >= ${y0} AND "y" <= ${y1} AND "z" >= ${z0} AND "z" <= ${z1};`;

  console.log("Querying indexer for blueprint data...");
  console.log(`Coordinate range: (${x0},${y0},${z0}) to (${x1},${y1},${z1})`);

  const response = await queryIndexer(sql);

  if (!response || !response.result || !response.result[0]) {
    throw new Error("Invalid response from indexer");
  }

  // Skip the header row and convert response to blueprint format
  const rows = response.result[0].slice(1); // Skip first element which is the header
  const blueprint: BlueprintEntry[] = rows.map((row) => ({
    coord: [Number(row[0]), Number(row[1]), Number(row[2])], // x, y, z as numbers
    id: Number(row[3]), // objectType as number
    orientation: 0, // Default orientation
  }));

  // Write to JSON file
  fs.writeFileSync(outputPath, JSON.stringify(blueprint, null, 2));
  console.log(`Blueprint written to ${outputPath}`);
  console.log(`Total entries: ${blueprint.length}`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 7) {
    console.error("Usage: tsx getBlueprint.ts <x0> <y0> <z0> <x1> <y1> <z1> <outputPath>");
    process.exit(1);
  }

  const [x0, y0, z0, x1, y1, z1] = args.slice(0, 6).map(Number);
  const outputPath = args[6];

  await getBlueprint(x0, y0, z0, x1, y1, z1, outputPath);
}

if (require.main === module) {
  main().catch(console.error);
}
