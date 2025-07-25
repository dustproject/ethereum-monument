import { keepPreviousData, useQuery } from "@tanstack/react-query";

async function fetchPlayerPositionBlueprint(playerPosition: {
  x: number;
  y: number;
  z: number;
}) {
  try {
    const response = await fetch(
      `https://dust-blueprint-redstone.latticexyz.workers.dev/?x=${playerPosition.x}&y=${playerPosition.y}&z=${playerPosition.z}`
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
      `https://dust-blueprint-redstone.latticexyz.workers.dev/?x=${cursorPosition.x}&y=${cursorPosition.y}&z=${cursorPosition.z}`
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
      const playerPositionBlueprint =
        await fetchPlayerPositionBlueprint(playerPosition);

      const finalBlueprint = [...(playerPositionBlueprint ?? [])];
      if (
        cursorPosition &&
        !(
          cursorPosition.x === playerPosition.x &&
          cursorPosition.y === playerPosition.y &&
          cursorPosition.z === playerPosition.z
        )
      ) {
        try {
          const cursorBlueprint = await fetchCursorBlueprint(cursorPosition);
          finalBlueprint.push(...cursorBlueprint);
        } catch (error) {
          console.error(error);
        }
      }

      return finalBlueprint;
    },
    placeholderData: keepPreviousData,
    refetchIntervalInBackground: true,
    enabled: !!playerPosition.x && !!playerPosition.y && !!playerPosition.z,
    retry: false,
  });
}
