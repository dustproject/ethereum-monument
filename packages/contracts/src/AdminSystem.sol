// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";

import { Admin } from "./codegen/tables/Admin.sol";

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

  function setBlueprintChunks(BlueprintChunkData[] calldata chunks) external onlyAdmin {
    for (uint256 i = 0; i < chunks.length; i++) {
      BlueprintLib.write(chunks[i].chunkCoord, chunks[i].data);
    }
  }
}
