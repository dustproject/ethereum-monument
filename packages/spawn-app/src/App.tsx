export default function App() {
  return (
    <div className="flex flex-col h-screen">
      <p className="p-10">
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
      <button className="bg-blue-500 text-white p-2">Spawn</button>
    </div>
  );
}
