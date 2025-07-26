import { keepPreviousData, useQuery } from "@tanstack/react-query";

const isDev = import.meta.env.MODE === "development";
const workerUrl = isDev
  ? "http://localhost:3002"
  : "https://monument-blueprint-worker.latticexyz.workers.dev";

async function fetchPlayerPositionBlueprint(playerPosition: {
  x: number;
  y: number;
  z: number;
}) {
  try {
    const response = await fetch(
      `${workerUrl}/?x=${playerPosition.x}&y=${playerPosition.y}&z=${playerPosition.z}`
    );
    return response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function fetchCursorBlueprint(cursorPosition: {
  x: number;
  y: number;
  z: number;
}) {
  try {
    const response = await fetch(
      `${workerUrl}/?x=${cursorPosition.x}&y=${cursorPosition.y}&z=${cursorPosition.z}`
    );
    return response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export function useBlueprintQuery({
  playerPosition,
  cursorPosition,
}: {
  playerPosition: { x: number; y: number; z: number };
  cursorPosition: { x: number; y: number; z: number } | null;
}) {
  return useQuery({
    queryKey: [
      "blueprint",
      playerPosition.x,
      playerPosition.y,
      playerPosition.z,
      cursorPosition?.x,
      cursorPosition?.y,
      cursorPosition?.z,
    ],
    queryFn: async () => {
      const lowermostCoord = [34, 75, -93];
      const lowermostChunkCoord = [
        Math.floor(lowermostCoord[0] / 16),
        Math.floor(lowermostCoord[1] / 16),
        Math.floor(lowermostCoord[2] / 16),
      ];
      const uppermostCoord = [85, 162, -92];
      const uppermostCoordChunkCoord = [
        Math.floor(uppermostCoord[0] / 16),
        Math.floor(uppermostCoord[1] / 16),
        Math.floor(uppermostCoord[2] / 16),
      ];
      const blueprintPromise: Promise[] = [];
      for (
        let x = lowermostChunkCoord[0];
        x <= uppermostCoordChunkCoord[0];
        x++
      ) {
        for (
          let y = lowermostChunkCoord[1];
          y <= uppermostCoordChunkCoord[1];
          y++
        ) {
          for (
            let z = lowermostChunkCoord[2];
            z <= uppermostCoordChunkCoord[2];
            z++
          ) {
            const chunkPosition = { x, y, z };
            console.log("fetching chunk at", chunkPosition);
            const chunkBlueprint = fetchPlayerPositionBlueprint(chunkPosition);
            blueprintPromise.push(chunkBlueprint);
          }
        }
      }

      console.log("waiting for all blueprints to resolve");
      const allBlueprints = await Promise.all(blueprintPromise);
      console.log("allBlueprints", allBlueprints);
      let finalBlueprint = [];
      for (const blueprint of allBlueprints) {
        finalBlueprint = [...finalBlueprint, ...(blueprint ?? [])];
      }
      return finalBlueprint;
    },
    placeholderData: keepPreviousData,
    refetchIntervalInBackground: true,
    enabled: !!playerPosition.x && !!playerPosition.y && !!playerPosition.z,
    retry: false,
  });
}
