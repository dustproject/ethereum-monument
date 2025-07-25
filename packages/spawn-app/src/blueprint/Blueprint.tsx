import {
  type ObjectDefinition,
  categories,
  encodePlayer,
  objects,
  packVec3,
} from "@dust/world/internal";
import IWorldAbi from "@dust/world/out/IWorld.sol/IWorld.abi";
import { resourceToHex } from "@latticexyz/common";
import { isNotNull } from "@latticexyz/common/utils";
import {
  camelToSpaces,
  decodeTransactionError,
  getObjectImageUrl,
  objectTypes,
  truncateStr,
} from "@permutation-city/common";
import { TableWithColumns } from "@permutation-city/ui";
import { useMutation } from "@tanstack/react-query";
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
  const { data: forceField, refetch: refetchForceField } = useForceFieldQuery(
    playerPosition?.x ?? 0,
    playerPosition?.y ?? 0,
    playerPosition?.z ?? 0
  );

  const expandForceField = useMutation({
    mutationFn: async () => {
      if (!dustClient || !blueprintData || blueprintData.length === 0) return;
      if (!forceField || forceField.current.forceField) {
        return;
      }
      if (!forceField.adjacent) {
        throw new Error(
          "No adjacent force field found. Cannot expand force field."
        );
      }
      console.log(
        "found blueprint, but no force field, expanding force field",
        forceField
      );
      const userAddress = dustClient.appContext.userAddress;
      const userEntityId = encodePlayer(userAddress);

      const result = await dustClient.provider.request({
        method: "systemCall",
        params: [
          {
            systemId: resourceToHex({
              type: "system",
              namespace: "",
              name: "ForceFieldSystem",
            }),
            abi: IWorldAbi,
            functionName: "addFragment",
            args: [
              userEntityId,
              cityForceFieldId,
              packVec3(forceField.adjacent.fragmentPos),
              packVec3(forceField.current.fragmentPos),
              "0x",
            ],
          },
        ],
      });
      console.log("addFragment result", result);

      const errorMessage = decodeTransactionError(IWorldAbi, result);
      if (errorMessage) {
        throw new Error(errorMessage);
      }
      refetchForceField();
      return result;
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies(expandForceField): suppress dependency expandForceField
  // biome-ignore lint/correctness/useExhaustiveDependencies(dustClient): suppress dependency dustClient
  // biome-ignore lint/correctness/useExhaustiveDependencies(blueprintData): suppress dependency blueprintData
  // biome-ignore lint/correctness/useExhaustiveDependencies(forceField): suppress dependency forceField
  useEffect(() => {
    expandForceField.mutate();
  }, [dustClient, blueprintData, forceField, expandForceField.mutate]);

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

  const blueprintItemsTableData = useMemo(() => {
    if (!blueprintData) return [];

    const uniqueObjectTypes = [
      ...new Set(blueprintData.map(({ objectTypeId }) => objectTypeId)),
    ];

    const blueprintItemsTableData = uniqueObjectTypes
      .map((objectTypeId) => {
        if (objectTypeId === 1) {
          return null;
        }

        return {
          id: objectTypeId,
          name: {
            value: truncateStr(
              camelToSpaces(objectTypes[objectTypeId]?.name).toUpperCase()
            ),
            icon: getObjectImageUrl(objectTypeId),
          },
        };
      })
      .filter(isNotNull);

    return [
      {
        id: -1,
        name: {
          value: "SCAFFOLD (DIRT)",
          icon: getObjectImageUrl(22),
        },
      },
      {
        id: 1,
        name: {
          value: "MINE",
          icon: getObjectImageUrl(32768),
        },
      },
      {
        id: 0,
        name: {
          value: "ALL BUILDING BLOCKS",
          icon: getObjectImageUrl(0),
        },
      },
      ...blueprintItemsTableData,
    ];
  }, [blueprintData]);

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
      <p className="text-left text-white/70 uppercase leading-normal">
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
    <>
      <TableWithColumns
        columns={[
          {
            name: "Name",
            key: "name",
          },
        ]}
        activeRowId={activeObjectTypeId}
        onClick={(item) => {
          setActiveObjectTypeId(Number(item.id));
          // setAutoSwitch(false); // TODO: add back
        }}
        data={blueprintItemsTableData}
        loading={isBlueprintLoading}
        searchable
      />
    </>
  );
}
