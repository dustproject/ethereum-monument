// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { ResourceId } from "@latticexyz/store/src/ResourceId.sol";
import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";

import { Admin } from "../src/codegen/tables/Admin.sol";
import { Script } from "./Script.sol";
import { WorldResourceIdInstance } from "@latticexyz/world/src/WorldResourceId.sol";
import { console } from "forge-std/console.sol";

import { forceFieldProgram } from "../src/codegen/systems/ForceFieldProgramLib.sol";


address constant ADMIN =0xE0ae70caBb529336e25FA7a1f036b77ad0089d2a;


contract PostDeploy is Script {
  using WorldResourceIdInstance for ResourceId;

  function run(address worldAddress) external {
    StoreSwitch.setStoreAddress(worldAddress);

    address sender = startBroadcast();
    console.log("Setting admin", ADMIN);
    Admin.set(ADMIN, true);
    console.log("Setting admin", sender);
    Admin.set(sender, true);
    vm.stopBroadcast();

    _setWorldAddress(worldAddress);
  }

  function _setWorldAddress(address worldAddress) internal {
    if (block.chainid != 31337) {
      console.log("Skipping world address setting on non-local network");
      return;
    }

    bytes32 worldSlot = keccak256("mud.store.storage.StoreSwitch");
    bytes32 worldAddressBytes32 = bytes32(uint256(uint160(worldAddress)));
    address forceFieldProgramAddress = forceFieldProgram.getAddress();
    vm.store(forceFieldProgramAddress, worldSlot, worldAddressBytes32);
  }
}
