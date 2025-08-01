import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  codegen: {
    generateSystemLibraries: true,
  },
  userTypes: {
    ObjectType: {
      filePath: "@dust/world/src/types/ObjectType.sol",
      type: "uint16",
    },
    EntityId: {
      filePath: "@dust/world/src/types/EntityId.sol",
      type: "bytes32",
    },
    ProgramId: {
      filePath: "@dust/world/src/types/ProgramId.sol",
      type: "bytes32",
    },
    ResourceId: {
      filePath: "@latticexyz/store/src/ResourceId.sol",
      type: "bytes32",
    },
  },
  namespace: "eth_monument",
  systems: {
    ForceFieldProgram: {
      openAccess: false,
      deploy: { registerWorldFunctions: false },
    },
    SpawnTileProgram: {
      openAccess: false,
      deploy: { registerWorldFunctions: false },
    },
    AdminSystem: {
      deploy: { registerWorldFunctions: false },
    },
  },
  tables: {
    Admin: {
      schema: {
        admin: "address",
        isAdmin: "bool",
      },
      key: ["admin"],
    },
    BlueprintContribution: {
      schema: {
        player: "address",
        objectType: "ObjectType",
        contribution: "uint256",
      },
      key: ["player", "objectType"],
    },
    ForceFieldDamage: {
      schema: {
        player: "address",
        damage: "uint256",
      },
      key: ["player"],
    },
    EnergyContribution: {
      schema: {
        player: "address",
        energy: "uint256",
      },
      key: ["player"],
    },
    // ForceField
    ForceField: {
      schema: {
        entityId: "EntityId",
      },
      key: [],
    },
    BlueprintChunk: {
      schema: {
        x: "int32",
        y: "int32",
        z: "int32",
        pointer: "address",
      },
      key: ["x", "y", "z"],
    },
    SpawnCount: {
      schema: {
        player: "address",
        count: "uint256",
      },
      key: ["player"],
    },
    // SpawnTile
    SpawnEnergyConsumed: {
      schema: {
        player: "address",
        energy: "uint128",
      },
      key: ["player"],
    },
  },
});
