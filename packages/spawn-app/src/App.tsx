import { Spawn } from "./spawn";
import { Blueprint } from "./blueprint";
import { usePlayerStatus } from "./usePlayerStatus";

export default function App() {
  const status = usePlayerStatus();
  return status === "dead" ? <Spawn /> : <Blueprint />;
}
