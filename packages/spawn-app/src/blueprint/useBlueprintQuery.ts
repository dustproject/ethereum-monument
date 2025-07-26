import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {} from "@dust/world/internal";

const isDev = import.meta.env.MODE === "development";
const workerUrl = isDev
  ? "http://localhost:3002"
  : "https://monument-blueprint-worker.latticexyz.workers.dev";

function toChunkCoord(
  voxel: readonly [number, number, number]
): [number, number, number] {
  return [
    Math.floor(voxel[0] / 16),
    Math.floor(voxel[1] / 16),
    Math.floor(voxel[2] / 16),
  ];
}

async function fetchBlueprint({
  x,
  y,
  z,
}: {
  x: number;
  y: number;
  z: number;
}) {
  try {
    const response = await fetch(`${workerUrl}/?x=${x}&y=${y}&z=${z}`);
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export function useBlueprintQuery({
  playerPosition,
}: {
  playerPosition: { x: number; y: number; z: number };
}) {
  return useQuery({
    queryKey: ["blueprint"],
    queryFn: async () => {
      const lowermostVoxelCoord = [34, 75, -93] as const;
      const lowermostChunkCoord = toChunkCoord(lowermostVoxelCoord);
      const uppermostVoxelCoord = [85, 162, -92] as const;
      const uppermostChunkCoord = toChunkCoord(uppermostVoxelCoord);

      const blueprintPromise: Promise<unknown>[] = [];
      for (let x = lowermostChunkCoord[0]; x <= uppermostChunkCoord[0]; x++) {
        for (let y = lowermostChunkCoord[1]; y <= uppermostChunkCoord[1]; y++) {
          for (
            let z = lowermostChunkCoord[2];
            z <= uppermostChunkCoord[2];
            z++
          ) {
            const chunkPosition = { x, y, z };
            console.log("fetching chunk at", chunkPosition);
            const chunkBlueprint = fetchBlueprint(chunkPosition);
            blueprintPromise.push(chunkBlueprint);
          }
        }
      }

      console.log("waiting for all blueprints to resolve");
      const allBlueprints = await Promise.all(blueprintPromise);
      console.log("allBlueprints", allBlueprints);
      const combinedBlueprint = allBlueprints.flat();
      return combinedBlueprint;
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 60,
    enabled: !!playerPosition.x && !!playerPosition.y && !!playerPosition.z,
    retry: false,
  });
}
