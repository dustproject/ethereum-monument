import { useState } from "react";
import { spawn } from "./spawn";

export default function App() {
  const [error, setError] = useState<string | undefined>(undefined);
  const [processing, setProcessing] = useState(false);

  const handleSpawn = async () => {
    setError(undefined);
    setProcessing(true);
    const { error } = await spawn();
    setError(error);
    setProcessing(false);
  };

  return (
    <div className="flex flex-col h-screen justify-between">
      <p className="pt-10 px-10">
        <img src="/10-years-ethereum.png" alt="Ethereum 10th Anniversary" />
        <br />
        In honor of Ethereum's 10 year anniversary, we are building an immortal
        monument.
        <br />
        <br />
        Every contribution matters and is permanently recorded onchain. Whether
        you're placing blocks to complete the blueprint or donating batteries to
        power the protective force field that will preserve the monument for
        generations.
        <br />
        <br />
        Spawn using the button below, and open the "Ethereum Monument" app to
        begin placing blocks according to the blueprint.
      </p>
      {error && <p className="text-red-500 text-center">{error}</p>}
      <button
        className="bg-blue-500 text-white p-2 hover:bg-blue-600 active:bg-blue-700"
        onClick={handleSpawn}
        disabled={processing}
      >
        {processing ? "Spawning..." : "Spawn at the Ethereum Monument"}
      </button>
    </div>
  );
}
