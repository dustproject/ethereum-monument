import {
  type ObjectDefinition,
  categories,
  objects,
} from "@dust/world/internal";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDustClient } from "./useDustClient";
import { useCursorPositionQuery } from "./useCursorPositionQuery";
import { usePlayerPositionQuery } from "./usePlayerPositionQuery";
// import { useAppStore } from "./useAppStore"; // TODO: add back
import { useBlueprintQuery } from "./useBlueprintQuery";
import { useSelectedObjectTypeQuery } from "./useSelectedObjectTypeQuery";
import { usePreviousNonNull } from "./usePreviousNonNull";

const objectsByObjectType = Object.fromEntries(
  Object.entries(objects).map(([, value]) => [value.id, value])
) as Record<number, ObjectDefinition>;

export function Blueprint() {
  // const { autoSwitch, setAutoSwitch } = useAppStore();
  const autoSwitch = false;
  const [activeObjectTypeId, setActiveObjectTypeId] = useState(0);
  const { data: dustClient } = useDustClient();
  const { data: cursor } = useCursorPositionQuery();
  const prevCursor = usePreviousNonNull(cursor);
  const { data: playerPosition } = usePlayerPositionQuery();
  const { data: selectedObjectType } = useSelectedObjectTypeQuery(autoSwitch);

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

    const filteredBlueprintData =
      activeObjectTypeId > 1
        ? blueprintData.filter(({ objectTypeId }) => {
            return activeObjectTypeId === objectTypeId;
          })
        : blueprintData;

    await dustClient.provider.request({
      method: "setBlueprint",
      params: {
        blocks: filteredBlueprintData,
        options:
          activeObjectTypeId === 1
            ? {
                showBlocksToBuild: false,
                showBlocksToMine: true,
              }
            : undefined,
      },
    });
  }, [blueprintData, dustClient, activeObjectTypeId]);

  useEffect(() => {
    setBlueprint();
  }, [setBlueprint]);

  useEffect(() => {
    if (autoSwitch) {
      if (selectedObjectType) {
        const selectedObject = objectsByObjectType[selectedObjectType];
        if (
          selectedObject &&
          categories.Tool.objects.includes(selectedObject.name)
        ) {
          setActiveObjectTypeId(1);
        } else {
          setActiveObjectTypeId(selectedObjectType);
        }
      } else {
        setActiveObjectTypeId(0);
      }
    }
  }, [autoSwitch, selectedObjectType]);

  const handleAddWaypoint = async () => {
    if (!dustClient) {
      throw new Error("Could not connect to Dust client");
    }
    console.log("requesting marker");
    await dustClient.provider.request({
      method: "setWaypoint",
      params: {
        entity:
          "0x030000023900000093fffffa1100000000000000000000000000000000000000",
        label: "Permutation City",
      },
    });
  };

  if (!isBlueprintLoading && (!blueprintData || blueprintData.length === 0)) {
    return (
      <p className="text-left uppercase leading-normal">
        You&apos;re too far from the Ethereum Monument. Come to{" "}
        <button
          type="button"
          className="text-[#FAE792]"
          onClick={handleAddWaypoint}
        >
          (569, 147, -1519)
        </button>{" "}
        to build the monument.
      </p>
    );
  }

  return (
    <div className="flex flex-col h-screen justify-between">
      <p className="pt-10 px-10">
        <img src="/10-years-ethereum.png" alt="Ethereum 10th Anniversary" />
        <br />
        Come over to the Ethereum Monument{" "}
        <button type="button" className="underline" onClick={handleAddWaypoint}>
          (569, 147, -1519)
        </button>{" "}
        and build the monument together!
        <br />
        <br />
        {/* Every contribution matters and is permanently recorded onchain. Whether
        you're placing blocks to complete the blueprint or donating batteries to
        power the protective force field that will preserve the monument for
        generations.
        <br />
        <br />
        Spawn using the button below, and open the "Ethereum Monument" app to
        begin placing blocks according to the blueprint. */}
      </p>
      {/* {error && <p className="text-red-500 text-center">{error}</p>} */}
      {/* <button
        className="bg-blue-500 text-white p-2 hover:bg-blue-600 active:bg-blue-700"
        onClick={handleSpawn}
        disabled={processing}
      >
        {processing ? "Spawning..." : "Spawn at the Ethereum Monument"}
      </button> */}
    </div>
  );
}
