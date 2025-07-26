import { useCallback, useEffect, useMemo } from "react";
import { useCursorPositionQuery } from "./useCursorPositionQuery";
import { usePlayerPositionQuery } from "./usePlayerPositionQuery";
import { useBlueprintQuery } from "./useBlueprintQuery";
import { usePreviousNonNull } from "./usePreviousNonNull";
import { dustClient } from "../dustClient";

export function Blueprint() {
  const { data: cursor } = useCursorPositionQuery();
  const prevCursor = usePreviousNonNull(cursor);
  const { data: playerPosition } = usePlayerPositionQuery();

  const {
    x: chunkX,
    y: chunkY,
    z: chunkZ,
  } = useMemo(() => {
    return {
      x: Math.floor((playerPosition?.x ?? 0) / 16),
      y: Math.floor((playerPosition?.y ?? 0) / 16),
      z: Math.floor((playerPosition?.z ?? 0) / 16),
    };
  }, [playerPosition?.x, playerPosition?.y, playerPosition?.z]);

  const { data: blueprintData, isLoading: isBlueprintLoading } =
    useBlueprintQuery({
      playerPosition: {
        x: chunkX,
        y: chunkY,
        z: chunkZ,
      },
      cursorPosition: {
        x: cursor?.x ?? prevCursor?.x ?? 0,
        y: cursor?.y ?? prevCursor?.y ?? 0,
        z: cursor?.z ?? prevCursor?.z ?? 0,
      },
    });

  const setBlueprint = useCallback(async () => {
    if (!dustClient || !blueprintData) return;

    await dustClient.provider.request({
      method: "setBlueprint",
      params: {
        blocks: blueprintData,
      },
    });
  }, [blueprintData, dustClient]);

  useEffect(() => {
    setBlueprint();
  }, [setBlueprint]);

  const handleAddWaypoint = async () => {
    if (!dustClient) {
      throw new Error("Could not connect to Dust client");
    }
    console.log("requesting marker");
    await dustClient.provider.request({
      method: "setWaypoint",
      params: {
        entity:
          "0x030000003c000000a1ffffffa700000000000000000000000000000000000000",
        label: "Ethereum Monument",
      },
    });
  };

  if (!isBlueprintLoading && (!blueprintData || blueprintData.length === 0)) {
    return (
      <div className="flex flex-col h-screen justify-between">
        <p className="pt-10 px-10">
          <img src="/10-years-ethereum.png" alt="Ethereum 10th Anniversary" />
          <br />
          You&apos;re too far from the Ethereum Monument. Come over to{" "}
          <button
            type="button"
            className="underline"
            onClick={handleAddWaypoint}
          >
            (60, 161, -89)
          </button>{" "}
          and build the monument together!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen justify-between">
      <p className="pt-10 px-10">
        <img src="/10-years-ethereum.png" alt="Ethereum 10th Anniversary" />
        <br />
        Come over to the Ethereum Monument{" "}
        <button type="button" className="underline" onClick={handleAddWaypoint}>
          (60, 161, -89)
        </button>{" "}
        and build the monument together!
      </p>
    </div>
  );
}
