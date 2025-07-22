// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";

import { EntityId } from "@dust/world/src/types/EntityId.sol";
import { ProgramId } from "@dust/world/src/types/ProgramId.sol";
import { Vec3 } from "@dust/world/src/types/Vec3.sol";

import { Admin } from "./codegen/tables/Admin.sol";
import { BlueprintChunk } from "./codegen/tables/BlueprintChunk.sol";

import { BlueprintChunkData, BlueprintLib } from "./BlueprintLib.sol";

contract AdminSystem is System {
  modifier onlyAdmin() {
    require(Admin.get() == _msgSender(), "Not the admin");
    _;
  }

  /**
   * @dev Sets a new global admin
   * @param admin The new admin address
   */
  function setAdmin(address admin) external onlyAdmin {
    Admin.set(admin);
  }

  function setBlueprintChunk(Vec3 chunkCoord, bytes memory chunkData) external onlyAdmin {
    BlueprintLib.write(chunkCoord, chunkData);
  }

  function setBlueprintChunks(BlueprintChunkData[] memory chunks) external onlyAdmin {
    for (uint256 i = 0; i < chunks.length; i++) {
      BlueprintLib.write(chunks[i].chunkCoord, chunks[i].data);
    }
  }
}
