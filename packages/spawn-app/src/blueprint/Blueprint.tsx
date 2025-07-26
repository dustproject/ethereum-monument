import { useCallback, useEffect, useMemo } from "react";
import { usePlayerPositionQuery } from "./usePlayerPositionQuery";
import { useBlueprintQuery } from "./useBlueprintQuery";
import { dustClient } from "../dustClient";
import { useRecords } from "@latticexyz/stash/react";
import { stash, tables } from "../mud/stash";

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

  // TODO: prettier styling for the leaderboard Blueprint contributions:
  return (
    <div className="flex flex-col h-screen justify-between">
      <p className="pt-10 px-10">
        <img src="/10-years-ethereum.png" alt="Ethereum 10th Anniversary" />
        <br />
        Follow the blueprint to construct the monument.
        <br />
        <br />
        <div className="flex flex-col gap-2">
          {blueprintContributions.map((contribution) => (
            <div key={contribution.player}>
              {contribution.player.slice(0, 6)}...
              {contribution.player.slice(-4)}:
              {String(contribution.contribution)}
            </div>
          ))}
        </div>
        Energy contributions:
        <div className="flex flex-col gap-2">
          {energyContributions.map((contribution) => (
            <div key={contribution.player}>
              {contribution.player.slice(0, 6)}...
              {contribution.player.slice(-4)}: {String(contribution.energy)}
            </div>
          ))}
        </div>
      </p>
    </div>
  );
}
