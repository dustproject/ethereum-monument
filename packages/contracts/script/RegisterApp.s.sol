// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { metadataSystem } from "@latticexyz/world-module-metadata/src/codegen/experimental/systems/MetadataSystemLib.sol";
import { ResourceId, WorldResourceIdInstance, WorldResourceIdLib } from "@latticexyz/world/src/WorldResourceId.sol";

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";

import { ResourceIds } from "@latticexyz/store/src/codegen/tables/ResourceIds.sol";
import { console } from "forge-std/console.sol";

import { Script } from "./Script.sol";

contract RegisterApp is Script {
  function run(address worldAddress) external {
    // Specify a store so that you can use tables directly in PostDeploy
    StoreSwitch.setStoreAddress(worldAddress);

    startBroadcast();

    ResourceId appNamespaceId = WorldResourceIdLib.encodeNamespace("eth_monument");

    metadataSystem.setResourceTag(
      appNamespaceId,
      "appConfigUrl",
      bytes("https://ethereum-monument.vercel.app/dust-app.json")
    );
    metadataSystem.setResourceTag(
      appNamespaceId,
      "spawnAppConfigUrl",
      bytes("https://ethereum-monument.vercel.app/dust-app.json")
    );

    vm.stopBroadcast();
  }
}
