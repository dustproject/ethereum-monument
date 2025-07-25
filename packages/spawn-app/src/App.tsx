import { Spawn } from "./spawn";
import { Blueprint } from "./blueprint";
import { usePlayerStatus } from "./usePlayerStatus";

export default function App() {
  const status = usePlayerStatus();
  if (!status) {
    return <div>Loading...</div>;
  }

  return status === "dead" ? <Spawn /> : <Blueprint />;
}
