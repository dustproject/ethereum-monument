// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { ResourceId } from "@latticexyz/store/src/ResourceId.sol";
import { WorldConsumer } from "@latticexyz/world-consumer/src/experimental/WorldConsumer.sol";
import { IWorld } from "@dust/world/src/codegen/world/IWorld.sol";
import { System } from "@latticexyz/world/src/System.sol";
import { WorldContextConsumer } from "@latticexyz/world/src/WorldContext.sol";

import { defaultProgramSystem } from "@dust/programs/src/codegen/systems/DefaultProgramSystemLib.sol";
import { BaseEntity } from "@dust/world/src/codegen/tables/BaseEntity.sol";
import { EntityId, EntityTypeLib } from "@dust/world/src/types/EntityId.sol";
import { ObjectType, ObjectTypes } from "@dust/world/src/types/ObjectType.sol";

import {
  AddFragmentContext,
  AttachProgramContext,
  BuildContext,
  DetachProgramContext,
  FuelContext,
  HitContext,
  IAttachProgram,
  IDetachProgram,
  IAddFragment,
  IBuild,
  IFuel,
  IHit,
  IMine,
  IProgramValidator,
  IRemoveFragment,
  MineContext,
  RemoveFragmentContext,
  ValidateProgramContext
} from "@dust/world/src/ProgramHooks.sol";

import { EntityOrientation } from "@dust/world/src/codegen/tables/EntityOrientation.sol";
import { Orientation } from "@dust/world/src/types/Orientation.sol";
import { ProgramId } from "@dust/world/src/types/ProgramId.sol";
import { Vec3 } from "@dust/world/src/types/Vec3.sol";

import { Admin } from "./codegen/tables/Admin.sol";

import { ForceField } from "./codegen/tables/ForceField.sol";

import { BlueprintLib } from "./BlueprintLib.sol";

import { getForceField } from "./utils/getForceField.sol";
import { isSafeCall } from "./utils/isSafeCall.sol";

contract ForceFieldProgram is
  IAttachProgram,
  IDetachProgram,
  IProgramValidator,
  IFuel,
  IHit,
  IAddFragment,
  IRemoveFragment,
  IBuild,
  IMine,
  System,
  WorldConsumer(IWorld(address(0)))
{
  function validateProgram(ValidateProgramContext calldata ctx) external view {
    revert("Program not allowed by forcefield");
  }

  function onAttachProgram(AttachProgramContext calldata ctx) public override onlyWorld {
    require(ctx.target.getObjectType() == ObjectTypes.ForceField, "Target must be a force field");
    require(ForceField.get().unwrap() == 0, "Force field already exists");
    ForceField.set(ctx.target);

    address admin = Admin.get();
    require(admin != address(0), "Admin not set");
    defaultProgramSystem.setAccessGroup(ctx.target, admin);
  }

  function onDetachProgram(DetachProgramContext calldata ctx) public override onlyWorld {
    ForceField.deleteRecord();
  }

  function onFuel(FuelContext calldata ctx) external onlyWorld {
    if (ctx.caller.getObjectType() == ObjectTypes.Chest) {
      // If the caller is a chest, we don't apply incentives
      return;
    }

    address player = ctx.caller.getPlayerAddress();
    if (player == address(0)) {
      return;
    }

    // TODO
  }

  function onHit(HitContext calldata ctx) external onlyWorld {
    address player = ctx.caller.getPlayerAddress();
    if (player == address(0)) {
      return;
    }

    // TODO
  }

  function onAddFragment(AddFragmentContext calldata ctx) external view onlyWorld {
    address player = ctx.caller.getPlayerAddress();
    bool hasBlueprint = BlueprintLib.hasBlueprint(ctx.added.getPosition().fromFragmentCoord());
    require(hasBlueprint, "Added fragment does not have a blueprint");
  }

  function onRemoveFragment(RemoveFragmentContext calldata ctx) external view onlyWorld {
    revert("Not allowed by forcefield");
  }

  function onBuild(BuildContext calldata ctx) external onlyWorld {
    address player = ctx.caller.getPlayerAddress();

    (ObjectType blueprintType, Orientation orientation) = BlueprintLib.getBlock(ctx.coord);
    require(blueprintType != ObjectTypes.Null, "Blueprint not set for coord");

    EntityId blockEntityId = EntityTypeLib.encodeBlock(ctx.coord);
    require(EntityOrientation.get(blockEntityId) == orientation, "Wrong blueprint direction");

    if (blueprintType == ctx.objectType) {
      // TODO
    } else if (blueprintType == ObjectTypes.Air) {
      require(ctx.objectType == ObjectTypes.Dirt, "Only dirt scaffold can be built here");
      // TODO
    } else {
      revert("Object does not match blueprint");
    }
  }

  function onMine(MineContext calldata ctx) external onlyWorld {
    address player = ctx.caller.getPlayerAddress();

    // TODO: use non-root .baseEntity() once supported by EntityId
    EntityId mined = EntityTypeLib.encodeBlock(ctx.coord);
    EntityId base = BaseEntity.get(mined);
    mined = base.unwrap() == 0 ? mined : base;

    // Additional protection for smart entities
    require(!ctx.objectType.isSmartEntity(), "Cannot mine smart entities");

    // Check blueprint permissions for non-council members
    (ObjectType blueprintType,) = BlueprintLib.getBlock(ctx.coord);
    require(blueprintType != ObjectTypes.Null, "Not allowed to mine here");

    require(ctx.objectType != blueprintType, "Not allowed by blueprint");
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
