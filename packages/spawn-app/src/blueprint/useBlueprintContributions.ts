import { useRecords } from "@latticexyz/stash/react";
import { stash, tables } from "../mud/stash";
import { useMemo } from "react";
import { getAddress, type Hex } from "viem";

export function useBlueprintContributions() {
  const blueprintContributions = useRecords({
    stash,
    table: tables.BlueprintContribution,
  });

  const groupedBlueprintContributions = useMemo(() => {
    if (!blueprintContributions) return [];

    const grouped = blueprintContributions.reduce(
      (
        acc: Record<
          Hex,
          {
            player: Hex;
            totalContribution: bigint;
            objectTypes: Record<number, bigint>;
          }
        >,
        contribution
      ) => {
        const player = getAddress(contribution.player);

        if (!acc[player]) {
          acc[player] = {
            player,
            totalContribution: 0n,
            objectTypes: {},
          };
        }

        acc[player].totalContribution += contribution.contribution;
        acc[player].objectTypes[contribution.objectType] =
          (acc[player].objectTypes[contribution.objectType] || 0n) +
          contribution.contribution;

        return acc;
      },
      {}
    );

    return Object.values(grouped).sort((a, b) =>
      Number(b.totalContribution - a.totalContribution)
    );
  }, [blueprintContributions]);

  return groupedBlueprintContributions;
}
