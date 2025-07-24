import { appContext } from "./provider";

export default function App() {
  return (
    <h1 className="text-3xl font-bold underline">
      Hello {appContext.userAddress}
    </h1>
  );
}
