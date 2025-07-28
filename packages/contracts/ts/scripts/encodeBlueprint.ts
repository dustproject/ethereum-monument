#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import type { ReadonlyVec3 } from "@dust/world/internal";
import bigJson from "big-json";
import type { Block } from "./Block";
import type { Chunk } from "./encodeBlueprintChunks";
import { encodeBlueprintChunks, groupByChunk } from "./encodeBlueprintChunks";

const ID_MAP: Record<number, number> = {
  [63]: 131, // border acacia leaf -> gold
  [62]: 334, // spruce leaf -> black glass
  [58]: 318, // oak leaf -> glass
  [59]: 330, // birch leaf -> blue glass
} as const;

async function readBlueprint(filePath: string): Promise<Block[]> {
  const absolutePath = path.resolve(filePath);

  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(absolutePath);
    const parseStream = bigJson.createParseStream();

    parseStream.on("data", (data: Block[]) => {
      resolve(data);
    });

    parseStream.on("error", (error: Error) => {
      reject(error);
    });

    readStream.pipe(parseStream);
  });
}

// Check if a chunk contains only air (id=1) or null (id=0) blocks
function isAirOrNullChunk(chunk: Chunk): boolean {
  return chunk.blocks.every((block) => block.id === 0 || block.id === 1);
}

// Get all 26 neighboring chunk coordinates (3x3x3 cube minus center)
function getNeighborCoords(coord: ReadonlyVec3): ReadonlyVec3[] {
  const [x, y, z] = coord;
  const neighbors: ReadonlyVec3[] = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue; // Skip center
        neighbors.push([x + dx, y + dy, z + dz]);
      }
    }
  }

  return neighbors;
}

// Filter out air/null chunks that are surrounded by other air/null chunks
function filterIsolatedAirChunks(chunks: Chunk[]): Chunk[] {
  // Create a map for quick lookup
  const chunkMap = new Map<string, Chunk>();
  for (const chunk of chunks) {
    const key = `${chunk.chunkCoord[0]},${chunk.chunkCoord[1]},${chunk.chunkCoord[2]}`;
    chunkMap.set(key, chunk);
  }

  // Check each chunk
  const filteredChunks: Chunk[] = [];

  for (const chunk of chunks) {
    // If chunk is not air/null, keep it
    if (!isAirOrNullChunk(chunk)) {
      filteredChunks.push(chunk);
      continue;
    }

    // Check if all neighbors are air/null or don't exist
    const neighbors = getNeighborCoords(chunk.chunkCoord);
    let hasNonAirNeighbor = false;

    for (const neighborCoord of neighbors) {
      const key = `${neighborCoord[0]},${neighborCoord[1]},${neighborCoord[2]}`;
      const neighborChunk = chunkMap.get(key);

      // If neighbor exists and is not air/null, keep this chunk
      if (neighborChunk && !isAirOrNullChunk(neighborChunk)) {
        hasNonAirNeighbor = true;
        break;
      }
    }

    // Keep the chunk if it has at least one non-air neighbor
    if (hasNonAirNeighbor) {
      filteredChunks.push(chunk);
    }
  }

  return filteredChunks;
}

async function main() {
  const [filePath, outputPath] = process.argv.slice(2, 4);
  if (!filePath || !outputPath) {
    console.error("Usage: encodeBlueprint <input-blueprint.json> <output.json>");
    process.exit(1);
  }

  try {
    console.log("Reading blueprint file...");
    let voxels = await readBlueprint(filePath);
    console.log(`Loaded ${voxels.length} blocks`);

    // Filter blocks to only keep those with z coordinate -92
    voxels = voxels.filter((block) => block.coord[2] === -92);
    console.log(`Filtered to ${voxels.length} blocks with z=-92`);

    // Map ids to the actual materials
    voxels = voxels.map((block) => ({
      ...block,
      id: ID_MAP[block.id] ?? 1,
    }));

    const chunks = groupByChunk(voxels);
    console.log(`Grouped into ${chunks.length} chunks.`);

    // Filter out isolated air chunks
    const filteredChunks = filterIsolatedAirChunks(chunks);
    console.log(
      `Filtered to ${filteredChunks.length} chunks (removed ${chunks.length - filteredChunks.length} isolated air chunks).`,
    );
    // For each chunk log the number of unique block types and total number of blocks
    // for (const chunk of filteredChunks) {
    //   const uniqueBlocks = new Set(chunk.blocks.map((b) => `${b.id}-${b.orientation}`));
    //   console.log(
    //     `Chunk ${chunk.chunkCoord[0]},${chunk.chunkCoord[1]},${chunk.chunkCoord[2]} has ${uniqueBlocks.size} unique blocks and ${chunk.blocks.length} total blocks.`,
    //   );
    // }

    const encodedChunks = encodeBlueprintChunks(filteredChunks);

    // Data is already Hex, no need to format
    const out = encodedChunks;

    console.log("Writing output file...");
    fs.writeFileSync(path.resolve(outputPath), JSON.stringify(out, null, 2));
    console.log("Done!");
  } catch (error) {
    console.error("Error processing blueprint:", error);
    process.exit(1);
  }
}

main();
