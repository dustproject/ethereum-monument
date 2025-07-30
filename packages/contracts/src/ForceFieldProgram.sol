// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { IWorld } from "@dust/world/src/codegen/world/IWorld.sol";
import { WorldConsumer } from "@latticexyz/world-consumer/src/experimental/WorldConsumer.sol";
import { System } from "@latticexyz/world/src/System.sol";
import { WorldContextConsumer } from "@latticexyz/world/src/WorldContext.sol";

import { EntityId, EntityTypeLib } from "@dust/world/src/types/EntityId.sol";
import { ObjectType, ObjectTypes } from "@dust/world/src/types/ObjectType.sol";

import { HookContext, IAddFragment, IAttachProgram, IBuild, IDetachProgram, IEnergize, IHit, IMine, IProgramValidator, IRemoveFragment } from "@dust/world/src/ProgramHooks.sol";

import { EntityOrientation } from "@dust/world/src/codegen/tables/EntityOrientation.sol";
import { Orientation } from "@dust/world/src/types/Orientation.sol";

import { Admin } from "./codegen/tables/Admin.sol";

import { BlueprintContribution } from "./codegen/tables/BlueprintContribution.sol";
import { EnergyContribution } from "./codegen/tables/EnergyContribution.sol";
import { ForceFieldDamage } from "./codegen/tables/ForceFieldDamage.sol";

import { ForceField } from "./codegen/tables/ForceField.sol";
import { defaultProgramSystem } from "@dust/programs/src/codegen/systems/DefaultProgramSystemLib.sol";

import { BlueprintLib } from "./BlueprintLib.sol";
import { Constants } from "./Constants.sol";

contract ForceFieldProgram is
  IAttachProgram,
  IDetachProgram,
  IProgramValidator,
  IEnergize,
  IHit,
  IAddFragment,
  IRemoveFragment,
  IBuild,
  IMine,
  System,
  WorldConsumer(Constants.DUST_WORLD)
{
  function setAccessGroup() external {
    require(Admin.get(_msgSender()), "Only admin can set access groups");
    EntityId forceField = ForceField.get();
    require(forceField.unwrap() != 0, "Force field not set");
    defaultProgramSystem.setAccessGroup(forceField, _msgSender());
  }

  function isScaffold(ObjectType objectType) internal pure returns (bool) {
    return objectType == ObjectTypes.Dirt || objectType == ObjectTypes.Moss || objectType.isLeaf();
  }

  function validateProgram(HookContext calldata ctx, ProgramData calldata) external view {
    address player = ctx.caller.getPlayerAddress();
    require(Admin.get(player), "Only admin can attach programs");
  }

  function onAttachProgram(HookContext calldata ctx) public override onlyWorld {
    address player = ctx.caller.getPlayerAddress();
    require(Admin.get(player), "Only admin can attach this program");

    require(ctx.target.getObjectType() == ObjectTypes.ForceField, "Target must be a force field");
    require(ForceField.get().unwrap() == 0, "Force field already exists");
    ForceField.set(ctx.target);
  }

  function onDetachProgram(HookContext calldata ctx) public override onlyWorld {
    address player = ctx.caller.getPlayerAddress();
    require(Admin.get(player), "Only admin can detach this program");
    ForceField.deleteRecord();
  }

  function onEnergize(HookContext calldata ctx, EnergizeData calldata energize) external onlyWorld {
    if (ctx.caller.getObjectType() == ObjectTypes.Chest) {
      // If the caller is a chest, we don't apply incentives
      return;
    }

    address player = ctx.caller.getPlayerAddress();
    if (player == address(0)) {
      return;
    }

    uint256 current = EnergyContribution.get(player);
    EnergyContribution.set(player, current + energize.amount);
  }

  function onHit(HookContext calldata ctx, HitData calldata hit) external onlyWorld {
    address player = ctx.caller.getPlayerAddress();
    if (player == address(0)) {
      return;
    }

    uint256 current = ForceFieldDamage.get(player);
    ForceFieldDamage.set(player, current + hit.damage);
  }

  function onAddFragment(HookContext calldata ctx, AddFragmentData calldata fragment) external view onlyWorld {
    address player = ctx.caller.getPlayerAddress();
    if (Admin.get(player)) {
      return;
    }

    bool hasBlueprint = BlueprintLib.hasBlueprint(fragment.added.getPosition().fromFragmentCoord());
    require(hasBlueprint, "Added fragment does not have a blueprint");
  }

  function onRemoveFragment(HookContext calldata ctx, RemoveFragmentData calldata) external view onlyWorld {
    address player = ctx.caller.getPlayerAddress();
    if (Admin.get(player)) {
      return;
    }

    revert("Not allowed by forcefield");
  }

  function onBuild(HookContext calldata ctx, BuildData calldata build) external onlyWorld {
    address player = ctx.caller.getPlayerAddress();
    bool isAdmin = Admin.get(player);

    (ObjectType blueprintType, Orientation orientation) = BlueprintLib.getBlock(build.coord);
    if (blueprintType == ObjectTypes.Null) {
      require(isAdmin || isScaffold(build.objectType), "Can only build dirt/moss/leaf as scaffold here");
      return;
    }

    EntityId blockEntityId = EntityTypeLib.encodeBlock(build.coord);
    require(EntityOrientation.get(blockEntityId) == orientation, "Wrong blueprint direction");

    if (blueprintType == build.objectType) {
      uint256 current = BlueprintContribution.get(player, blueprintType);
      BlueprintContribution.set(player, blueprintType, current + 1);
    } else {
      require(
        isScaffold(build.objectType),
        "Object does not match blueprint, can only build dirt/moss/leaf as scaffold here"
      );
    }
  }

  function onMine(HookContext calldata ctx, MineData calldata mine) external view onlyWorld {
    address player = ctx.caller.getPlayerAddress();
    bool isAdmin = Admin.get(player);

    // Additional protection for smart entities
    require(isAdmin || !mine.objectType.isSmartEntity(), "Cannot mine smart entities");

    (ObjectType blueprintType, ) = BlueprintLib.getBlock(mine.coord);
    if (blueprintType == ObjectTypes.Null) {
      if (isAdmin || isScaffold(mine.objectType)) {
        return; // Allow mining dirt/moss if no blueprint is set
      }
      revert("Not allowed to mine here");
    }

    require(mine.objectType != blueprintType, "Not allowed by blueprint");
  }

  // Other hooks revert
  fallback() external {
    revert("Hook not supported by forcefield");
  }

  // Required due to inheriting from System and WorldConsumer
  function _msgSender() public view override(WorldContextConsumer, WorldConsumer) returns (address) {
    return WorldConsumer._msgSender();
  }

  function _msgValue() public view override(WorldContextConsumer, WorldConsumer) returns (uint256) {
    return WorldConsumer._msgValue();
  }
}
