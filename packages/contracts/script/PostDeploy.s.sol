// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { ResourceId } from "@latticexyz/store/src/ResourceId.sol";
import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";

import { Admin } from "../src/codegen/tables/Admin.sol";
import { Script } from "./Script.sol";
import { WorldResourceIdInstance } from "@latticexyz/world/src/WorldResourceId.sol";
import { console } from "forge-std/console.sol";

import { forceFieldProgram } from "../src/codegen/systems/ForceFieldProgramLib.sol";
import { Systems } from "@latticexyz/world/src/codegen/tables/Systems.sol";
import { EntityId, EntityTypeLib } from "@dust/world/src/types/EntityId.sol";
import { ForceField } from "../src/codegen/tables/ForceField.sol";
import { defaultProgramSystem } from "@dust/programs/src/codegen/systems/DefaultProgramSystemLib.sol";

address constant ADMIN = 0xe1938cee72C377AA12a294B12bDA9D61EE2E3A95;

contract PostDeploy is Script {
  using WorldResourceIdInstance for ResourceId;

  function run(address worldAddress) external {
    StoreSwitch.setStoreAddress(worldAddress);
    address sender = startBroadcast();

    // TODO: call this onAttach
    // (address programAddress, ) = Systems.get(forceFieldProgram.toResourceId());
    // (bool success, ) = programAddress.call(abi.encodeWithSignature("setAccessGroup()"));
    // require(success, "setAccessGroup() failed");
    // EntityId forceField = ForceField.get();
    // if (forceField.unwrap() != 0) {
    //   defaultProgramSystem.setMembership(forceField, ADMIN, true);
    // }

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
