import { createStash } from "@latticexyz/stash/internal";
import type { SyncFilter } from "@latticexyz/store-sync";
import dustWorldConfig from "@dust/world/mud.config";
import monumentConfig from "ethereum-monument/mud.config";
import { playerEntityId, worldAddress } from "../common";
import { syncToStash } from "@latticexyz/store-sync/internal";
import { redstone } from "@latticexyz/common/chains";

export const tables = {
  Energy: dustWorldConfig.tables.Energy,
  BlueprintContribution:
    monumentConfig.tables.eth_monument__BlueprintContribution,
  EnergyContribution: monumentConfig.tables.eth_monument__EnergyContribution,
};

export const stashConfig = {
  namespaces: {
    "": {
      tables,
    },
  },
};

export const filters = [
  {
    tableId: tables.Energy.tableId,
    key0: playerEntityId,
  },
  {
    tableId: tables.BlueprintContribution.tableId,
  },
  {
    tableId: tables.EnergyContribution.tableId,
  },
] satisfies SyncFilter[];

export const stash = createStash(stashConfig);

await syncToStash({
  address: worldAddress,
  stash,
  filters,
  internal_clientOptions: { chain: redstone },
  indexerUrl: redstone.indexerUrl,
});
