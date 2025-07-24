import { createStash } from "@latticexyz/stash/internal";
import type { SyncFilter } from "@latticexyz/store-sync";
import mudConfig from "@dust/world/mud.config";
import { playerEntityId, worldAddress } from "../common";
import { syncToStash } from "@latticexyz/store-sync/internal";
import { redstone } from "@latticexyz/common/chains";

export const tables = {
  Energy: mudConfig.tables.Energy,
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
    // key0: playerEntityId,
  },
] satisfies SyncFilter[];

export const stash = createStash(stashConfig);

const result = await syncToStash({
  address: worldAddress,
  stash,
  filters,
  internal_clientOptions: { chain: redstone },
  indexerUrl: redstone.indexerUrl,
});

result.storedBlockLogs$.subscribe((x) => {
  console.log("got block", x.blockNumber);
});

(window as any).stash = stash;
