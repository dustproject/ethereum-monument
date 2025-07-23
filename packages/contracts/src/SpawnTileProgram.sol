// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { WorldConsumer } from "@latticexyz/world-consumer/src/experimental/WorldConsumer.sol";
import { System } from "@latticexyz/world/src/System.sol";
import { WorldContextConsumer } from "@latticexyz/world/src/WorldContext.sol";

import { MAX_PLAYER_ENERGY } from "@dust/world/src/Constants.sol";
import { ISpawn, SpawnContext } from "@dust/world/src/ProgramHooks.sol";

import {
  AttachProgramContext, DetachProgramContext, IAttachProgram, IDetachProgram
} from "@dust/world/src/ProgramHooks.sol";
import { Energy } from "@dust/world/src/codegen/tables/Energy.sol";
import { ObjectPhysics } from "@dust/world/src/codegen/tables/ObjectPhysics.sol";
import { IWorld } from "@dust/world/src/codegen/world/IWorld.sol";
import { EntityId } from "@dust/world/src/types/EntityId.sol";
import { ObjectTypes } from "@dust/world/src/types/ObjectType.sol";

import { Admin } from "./codegen/tables/Admin.sol";
import { Contribution } from "./codegen/tables/Contribution.sol";
import { ForceFieldDamage } from "./codegen/tables/ForceFieldDamage.sol";
import { SpawnEnergyConsumed } from "./codegen/tables/SpawnEnergyConsumed.sol";
import { getForceField } from "./utils/getForceField.sol";

uint128 constant MIN_ENERGY_THRESHOLD_TO_SPAWN = 200_000_000_000_000_000_000;

contract SpawnTileProgram is IAttachProgram, IDetachProgram, ISpawn, System, WorldConsumer(IWorld(address(0))) {
  function onAttachProgram(AttachProgramContext calldata ctx) public view override onlyWorld {
    address admin = Admin.get();
    require(admin == ctx.caller.getPlayerAddress(), "Only admin can attach this program");

    require(ctx.target.getObjectType() == ObjectTypes.SpawnTile, "Target must be a spawn tile");
  }

  function onDetachProgram(DetachProgramContext calldata ctx) public override onlyWorld {
    // TODO: check if safe call
    address admin = Admin.get();
    require(admin == ctx.caller.getPlayerAddress(), "Only admin can detach this program");
  }

  function onSpawn(SpawnContext calldata ctx) external onlyWorld {
    address player = ctx.caller.getPlayerAddress();
    uint256 forceFieldDamage = ForceFieldDamage.get(player);
    require(forceFieldDamage == 0, "You are not welcome here");

    uint128 energyConsumed = SpawnEnergyConsumed.get(player);
    uint256 batteriesContributed = Contribution.get(player, ObjectTypes.Battery);

    uint256 availableEnergy = batteriesContributed * ObjectPhysics.getEnergy(ObjectTypes.Battery) - energyConsumed;
    require(ctx.spawnEnergy <= availableEnergy, "Not enough energy contributed");

    SpawnEnergyConsumed.set(player, energyConsumed + ctx.spawnEnergy);

    (EntityId forceField,) = getForceField(ctx.target);
    require(
      forceField.exists() && Energy.getEnergy(forceField) >= MIN_ENERGY_THRESHOLD_TO_SPAWN,
      "Insufficient energy in force field"
    );
  }

  // Required due to inheriting from System and WorldConsumer
  function _msgSender() public view override(WorldContextConsumer, WorldConsumer) returns (address) {
    return WorldConsumer._msgSender();
  }

  function _msgValue() public view override(WorldContextConsumer, WorldConsumer) returns (uint256) {
    return WorldConsumer._msgValue();
  }
}
