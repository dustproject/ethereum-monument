import { Spawn } from "./spawn";
import { Blueprint } from "./blueprint";
import { usePlayerStatus } from "./usePlayerStatus";
import { useSyncStatus } from "./mud/useSyncStatus";

export default function App() {
  const syncStatus = useSyncStatus();
  const playerStatus = usePlayerStatus();

  if (!syncStatus.isLive || !playerStatus) {
    return (
      <div className="flex flex-col h-screen justify-between">
        <p className="pt-8 px-6">
          <img src="/10-years-ethereum.png" alt="Ethereum 10th Anniversary" />
          <br />
          Syncing ({syncStatus.percentage}%)...
        </p>
      </div>
    );
  }

  return playerStatus === "dead" ? <Spawn /> : <Blueprint />;
}
