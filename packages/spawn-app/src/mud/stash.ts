import { createStash } from "@latticexyz/stash/internal";
import type { SyncFilter } from "@latticexyz/store-sync";
import mudConfig from "@dust/world/mud.config";

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
  },
] satisfies SyncFilter[];

export const stash = createStash(stashConfig);
