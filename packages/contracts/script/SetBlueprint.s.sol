// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Vec3, vec3 } from "@dust/world/src/types/Vec3.sol";
import { console } from "forge-std/console.sol";

import { BlueprintChunkData } from "../src/BlueprintLib.sol";
import { adminSystem } from "../src/codegen/systems/AdminSystemLib.sol";

import { Script } from "./Script.sol";

struct BlueprintChunkJson {
  int32[] chunkCoord;
  bytes chunkData;
}

library ChunkUtils {
  function toVec3(int32[] memory coord) internal pure returns (Vec3) {
    return vec3(coord[0], coord[1], coord[2]);
  }
}

contract SetBlueprint is Script {
  using ChunkUtils for int32[];

  function run(string calldata path) external {
    console.log("Reading blueprints from %s", path);

    BlueprintChunkJson[] memory chunks = _loadChunks(path);

    startBroadcast();
    _setChunks(chunks);
    vm.stopBroadcast();
  }

  function _loadChunks(string calldata path) private view returns (BlueprintChunkJson[] memory) {
    string memory json = vm.readFile(path);
    bytes memory data = vm.parseJson(json);
    return abi.decode(data, (BlueprintChunkJson[]));
  }

  function _setChunks(BlueprintChunkJson[] memory chunks) private {
    BlueprintChunkData[] memory chunkData = new BlueprintChunkData[](chunks.length);

    for (uint256 i = 0; i < chunks.length; i++) {
      BlueprintChunkJson memory chunk = chunks[i];
      chunkData[i] = BlueprintChunkData({ chunkCoord: chunk.chunkCoord.toVec3(), data: chunk.chunkData });
    }

    adminSystem.setBlueprintChunks(chunkData);
    console.log("Set %d chunks", chunks.length);
  }
}
