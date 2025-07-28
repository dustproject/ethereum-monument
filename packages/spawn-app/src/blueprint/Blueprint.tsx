import { useCallback, useEffect, useMemo } from "react";
import { formatEther, type Hex } from "viem";
import { objects } from "@dust/world/internal";
import { usePlayerPositionQuery } from "./usePlayerPositionQuery";
import { useBlueprintQuery } from "./useBlueprintQuery";
import { dustClient } from "../dustClient";
import { useRecords } from "@latticexyz/stash/react";
import { stash, tables } from "../mud/stash";
import { useENS } from "./useENS";
import { TruncatedHex } from "./TruncatedHex";
import { getObjectImageUrl } from "./getObjectImageUrl";
import { camelToSpaces } from "./camelToSpaces";

function PlayerName({ address }: { address: Hex }) {
  const { data: ens } = useENS(address);
  return (
    <span className="font-medium">
      {ens?.displayName ?? <TruncatedHex hex={address} />}
    </span>
  );
}

export function Blueprint() {
  const { data: playerPosition } = usePlayerPositionQuery();
  const blueprintContributions = useRecords({
    stash,
    table: tables.BlueprintContribution,
  });
  const energyContributions = useRecords({
    stash,
    table: tables.EnergyContribution,
  });

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
    });

  const setBlueprint = useCallback(async () => {
    if (!dustClient || !blueprintData) return;

    await dustClient.provider.request({
      method: "setBlueprint",
      params: {
        blocks: blueprintData,
      },
    });
  }, [blueprintData]);

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
          "0x03000000390000003fffffffa900000000000000000000000000000000000000",
        label: "Ethereum Monument",
      },
    });
  };

  const uniqueObjectTypeIds = useMemo(() => {
    const ids = [...new Set(blueprintData?.map((block) => block.objectTypeId))];
    return ids.sort((a, b) => {
      if (a === 1) return -1;
      if (b === 1) return 1;
      return a - b;
    });
  }, [blueprintData]);

  if (!isBlueprintLoading && (!blueprintData || blueprintData.length === 0)) {
    return (
      <div className="flex flex-col h-screen justify-between">
        <p className="pt-8 px-6">
          <img src="/10-years-ethereum.png" alt="Ethereum 10th Anniversary" />
          <br />
          You&apos;re too far from the Ethereum Monument. Come over to{" "}
          <button
            type="button"
            className="underline"
            onClick={handleAddWaypoint}
          >
            (57, 64, -88)
          </button>{" "}
          and build the monument together!
        </p>
      </div>
    );
  }

  // TODO: prettier styling for the leaderboard Blueprint contributions:
  return (
    <div className="flex flex-col h-screen justify-between">
      <div className="pt-8 px-6 pb-10">
        <img src="/10-years-ethereum.png" alt="Ethereum 10th Anniversary" />

        <div className="pt-8">
          <h2 className="text-lg font-bold pb-1">Instructions:</h2>
          <p>
            Place blocks to complete the monument&apos;s blueprint at{" "}
            <span
              className="font-semibold cursor-pointer"
              onClick={handleAddWaypoint}
            >
              (60, 161, -89) 📍
            </span>
            . Supply batteries{" "}
            <img
              src={getObjectImageUrl(32793)}
              alt="Battery"
              className="inline-block w-5 h-5 -mt-[5px]"
            />{" "}
            to energize the monument&apos;s force field.
          </p>
        </div>

        <div className="pt-8">
          <h2 className="text-lg font-bold pb-1">Energy contributors:</h2>
          <div className="flex flex-col gap-2">
            {!blueprintContributions.length && (
              <p className="text-black/70">No blueprint contributions yet.</p>
            )}

            {blueprintContributions.map((contribution) => (
              <div
                key={contribution.player}
                className="flex gap-2 justify-between items-center"
              >
                <PlayerName address={contribution.player} />
                {formatEther(contribution.contribution)}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8">
          <h2 className="text-lg font-bold pb-1">Battery contributors:</h2>
          <div className="flex flex-col gap-2">
            {!energyContributions.length && (
              <p className="text-black/70">No battery contributions yet.</p>
            )}

            {energyContributions.map((contribution) => (
              <div
                key={contribution.player}
                className="flex gap-2 justify-between items-center"
              >
                <PlayerName address={contribution.player} />
                {contribution.energy > 0
                  ? new Intl.NumberFormat("en-US", {
                      maximumFractionDigits: 2,
                    }).format(
                      Number(
                        (BigInt(contribution.energy) / 10n ** 14n).toString()
                      )
                    )
                  : "0"}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8">
          <h2 className="text-lg font-bold pb-1">Blueprint blocks:</h2>
          <div className="flex flex-col gap-2">
            {uniqueObjectTypeIds.map((objectTypeId) => {
              const isAir = objectTypeId === 1;
              const finalObjectTypeId = isAir ? 32768 : objectTypeId;
              const object = objects.find((o) => o.id === finalObjectTypeId);
              return (
                <div
                  key={finalObjectTypeId}
                  className="flex gap-2 items-center"
                >
                  <img
                    src={getObjectImageUrl(finalObjectTypeId)}
                    alt={`Object ${finalObjectTypeId}`}
                    className="w-10 h-10"
                  />
                  <span>
                    {isAir ? "Mine" : camelToSpaces(object?.name ?? "")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
