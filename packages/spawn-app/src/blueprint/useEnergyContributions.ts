import { useMemo } from "react";
import { useRecords } from "@latticexyz/stash/react";
import { stash, tables } from "../mud/stash";

export function useEnergyContributions() {
  const energyContributions = useRecords({
    stash,
    table: tables.EnergyContribution,
  });

  const sortedEnergyContributions = useMemo(() => {
    if (!energyContributions) return [];
    return [...energyContributions].sort(
      (a: { energy: bigint }, b: { energy: bigint }) =>
        Number(b.energy) - Number(a.energy)
    );
  }, [energyContributions]);

  return sortedEnergyContributions;
}
