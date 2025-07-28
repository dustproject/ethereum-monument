// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { WorldConsumer } from "@latticexyz/world-consumer/src/experimental/WorldConsumer.sol";
import { System } from "@latticexyz/world/src/System.sol";
import { WorldContextConsumer } from "@latticexyz/world/src/WorldContext.sol";

import { HookContext, IAttachProgram, IDetachProgram, ISpawn } from "@dust/world/src/ProgramHooks.sol";

import { Energy } from "@dust/world/src/codegen/tables/Energy.sol";
import { IWorld } from "@dust/world/src/codegen/world/IWorld.sol";
import { EntityId } from "@dust/world/src/types/EntityId.sol";
import { ObjectTypes } from "@dust/world/src/types/ObjectType.sol";

import { Admin } from "./codegen/tables/Admin.sol";
import { SpawnCount } from "./codegen/tables/SpawnCount.sol";

import { EnergyContribution } from "./codegen/tables/EnergyContribution.sol";
import { ForceFieldDamage } from "./codegen/tables/ForceFieldDamage.sol";
import { SpawnEnergyConsumed } from "./codegen/tables/SpawnEnergyConsumed.sol";
import { getForceField } from "./utils/getForceField.sol";
import { Constants } from "./Constants.sol";

uint128 constant MIN_ENERGY_THRESHOLD_TO_SPAWN = 10_000_000_000_000_000_000;
uint256 constant FREE_SPAWNS = 2;

contract SpawnTileProgram is IAttachProgram, IDetachProgram, ISpawn, System, WorldConsumer(Constants.DUST_WORLD) {
  function onAttachProgram(HookContext calldata ctx) public view override onlyWorld {
    address player = ctx.caller.getPlayerAddress();
    require(Admin.get(player), "Only admin can attach this program");

    require(ctx.target.getObjectType() == ObjectTypes.SpawnTile, "Target must be a spawn tile");
  }

  function onDetachProgram(HookContext calldata ctx) public view override onlyWorld {
    // NOTE: we don't care about revertOnFailure because we are not modifying any state
    address player = ctx.caller.getPlayerAddress();
    require(Admin.get(player), "Only admin can detach this program");
  }

  function onSpawn(HookContext calldata ctx, SpawnData calldata spawn) external onlyWorld {
    address player = ctx.caller.getPlayerAddress();
    if (Admin.get(player)) {
      return;
    }

    uint256 forceFieldDamage = ForceFieldDamage.get(player);
    require(forceFieldDamage == 0, "You are not welcome here");

    (EntityId forceField, ) = getForceField(ctx.target);
    require(
      forceField.exists() && Energy.getEnergy(forceField) >= MIN_ENERGY_THRESHOLD_TO_SPAWN,
      "Insufficient energy in force field"
    );

    uint256 spawnCount = SpawnCount.get(player);

    if (spawnCount > FREE_SPAWNS) {
      uint128 energyConsumed = SpawnEnergyConsumed.get(player);
      uint256 energyContributed = EnergyContribution.get(player);

      uint256 availableEnergy = energyContributed - energyConsumed;
      require(spawn.energy <= availableEnergy, "Not enough energy contributed");
      SpawnEnergyConsumed.set(player, energyConsumed + spawn.energy);
    }

    SpawnCount.set(player, spawnCount + 1);
  }

  // Required due to inheriting from System and WorldConsumer
  function _msgSender() public view override(WorldContextConsumer, WorldConsumer) returns (address) {
    return WorldConsumer._msgSender();
  }

  function _msgValue() public view override(WorldContextConsumer, WorldConsumer) returns (uint256) {
    return WorldConsumer._msgValue();
  }
}
