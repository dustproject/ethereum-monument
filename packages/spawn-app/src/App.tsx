import { createSyncAdapter } from "@latticexyz/store-sync/internal";
import { worldAddress } from "./common";
import { filters, stash } from "./mud/stash";
import { SpawnPage } from "./spawn";
import { SyncProvider } from "@latticexyz/store-sync/react";

export default function App() {
  <SyncProvider
    chainId={690}
    address={worldAddress}
    filters={filters}
    adapter={createSyncAdapter({ stash })}
  >
    <SpawnPage />;
  </SyncProvider>;
}
