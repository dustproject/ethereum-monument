// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { LibBit } from "solady/utils/LibBit.sol";
import { SSTORE2 } from "solady/utils/SSTORE2.sol";

import { ObjectType, ObjectTypes } from "@dust/world/src/types/ObjectType.sol";

import { Orientation } from "@dust/world/src/types/Orientation.sol";
import { Vec3 } from "@dust/world/src/types/Vec3.sol";

import { BlueprintChunk } from "./codegen/tables/BlueprintChunk.sol";

uint256 constant MIN_HEADER_SIZE = 1; // version only
int32 constant BLUEPRINT_CHUNK_SIZE = 16;

// Struct for batch chunk operations
struct BlueprintChunkData {
  Vec3 chunkCoord;
  bytes data;
}

library BlueprintLib {
  using LibBit for uint256;
  using SSTORE2 for address;

  bytes1 private constant _VERSION = 0x01;

  function getBlock(Vec3 coord) internal view returns (ObjectType blockType, Orientation orientation) {
    Vec3 chunkCoord = coord.toChunkCoord();
    (int32 x, int32 y, int32 z) = chunkCoord.xyz();
    address pointer = BlueprintChunk.get(x, y, z);
    if (pointer == address(0)) {
      return (ObjectTypes.Null, Orientation.wrap(0));
    }

    // Check if this is encoded data (no contract) or SSTORE2 pointer (has contract)
    if (pointer.code.length == 0) {
      // Data encoded directly in address - 4 bytes packed from right to left
      bytes memory data = abi.encodePacked(pointer);

      // Extract from the rightmost 4 bytes (indices 16-19 of the 20-byte address)
      uint8 version = uint8(data[16]);
      require(version == uint8(_VERSION), "Unsupported blueprint encoding version");

      uint16 objectType = uint16(uint8(data[17])) << 8 | uint16(uint8(data[18]));
      uint8 orientationValue = uint8(data[19]);

      blockType = ObjectType.wrap(objectType);
      orientation = Orientation.wrap(orientationValue);
      return (blockType, orientation);
    }

    // Regular SSTORE2 decoding for palette chunks
    bytes memory header = pointer.read(0, MIN_HEADER_SIZE);
    require(header[0] == _VERSION, "Unsupported blueprint encoding version");

    // Always palette encoding for SSTORE2
    return _readPaletteBlock(pointer, coord);
  }

  function hasBlueprint(Vec3 coord) internal view returns (bool) {
    (int32 x, int32 y, int32 z) = coord.floorDiv(BLUEPRINT_CHUNK_SIZE).xyz();
    address pointer = BlueprintChunk.get(x, y, z);
    return pointer != address(0);
  }

  function write(Vec3 chunkCoord, bytes memory compressedData) internal {
    (int32 x, int32 y, int32 z) = chunkCoord.xyz();

    // If no data being set, just invalidate previous blueprint
    if (compressedData.length == 0) {
      BlueprintChunk.set(x, y, z, address(0));
      return;
    }

    // Validate compressed data format
    require(compressedData.length >= MIN_HEADER_SIZE, "Data too short");
    require(compressedData[0] == _VERSION, "Invalid version");

    // Check if this is single-type encoding (4 bytes)
    if (compressedData.length == 4) {
      // For single-type chunks, encode the 4 bytes directly in the address
      // Address is 20 bytes, we use the rightmost 4 bytes for our data
      bytes memory addressBytes = new bytes(20);
      // Copy the 4 bytes to positions 16-19
      for (uint256 i = 0; i < 4; i++) {
        addressBytes[16 + i] = compressedData[i];
      }
      address encodedPointer = address(uint160(bytes20(addressBytes)));
      BlueprintChunk.set(x, y, z, encodedPointer);
      return;
    }

    // Otherwise it's palette encoding
    require(compressedData.length >= 2, "Invalid palette encoding header");
    uint8 paletteSize = uint8(compressedData[1]);
    uint8 bitsPerBlock = _calculateBitsPerBlock(paletteSize);

    // Calculate minimum size (header + palette)
    uint256 paletteBytes = uint256(paletteSize) * 3;
    uint256 minSize = 2 + paletteBytes;
    require(compressedData.length >= minSize, "Invalid data size: too small for palette");

    // Calculate maximum expected size
    uint256 chunkSize = uint256(int256(BLUEPRINT_CHUNK_SIZE));
    uint256 totalBlocks = chunkSize * chunkSize * chunkSize;
    uint256 maxDataBytes = (totalBlocks * uint256(bitsPerBlock) + 7) / 8;
    uint256 maxSize = minSize + maxDataBytes;

    require(compressedData.length <= maxSize, "Invalid data size: too large");

    address pointer = SSTORE2.write(compressedData);
    BlueprintChunk.set(x, y, z, pointer);
  }

  function _readPaletteBlock(address pointer, Vec3 coord)
    private
    view
    returns (ObjectType blockType, Orientation orientation)
  {
    // Read palette size
    bytes memory paletteHeader = pointer.read(MIN_HEADER_SIZE, MIN_HEADER_SIZE + 1);
    uint8 paletteSize = uint8(paletteHeader[0]);
    uint8 bitsPerBlock = _calculateBitsPerBlock(paletteSize);

    // Read palette
    uint256 paletteStart = MIN_HEADER_SIZE + 1;
    uint256 paletteEnd = paletteStart + uint256(paletteSize) * 3;
    bytes memory palette = pointer.read(paletteStart, paletteEnd);

    // Calculate block index within chunk
    uint256 blockIndex = _getBlockIndex(coord);

    // Extract palette index from packed data
    uint256 paletteIndex = _extractBits(pointer, paletteEnd, blockIndex, bitsPerBlock);

    // Look up block in palette
    if (paletteIndex >= paletteSize) {
      return (ObjectTypes.Null, Orientation.wrap(0));
    }

    uint256 paletteOffset = paletteIndex * 3;
    blockType = ObjectType.wrap(uint16(uint8(palette[paletteOffset]) << 8 | uint8(palette[paletteOffset + 1])));
    orientation = Orientation.wrap(uint8(palette[paletteOffset + 2]));
  }

  function _getRelativeCoord(Vec3 coord) private pure returns (Vec3) {
    return coord.mod(BLUEPRINT_CHUNK_SIZE);
  }

  function _getBlockIndex(Vec3 coord) private pure returns (uint256) {
    Vec3 relativeCoord = _getRelativeCoord(coord);
    (int32 rx, int32 ry, int32 rz) = relativeCoord.xyz();
    uint256 chunkSize = uint256(int256(BLUEPRINT_CHUNK_SIZE));
    return uint256(uint256(int256(rx)) * chunkSize ** 2 + uint256(int256(ry)) * chunkSize + uint256(int256(rz)));
  }

  function _extractBits(address pointer, uint256 dataStart, uint256 blockIndex, uint8 bitsPerBlock)
    private
    view
    returns (uint256)
  {
    if (bitsPerBlock == 0) return 0;

    uint256 bitIndex = blockIndex * uint256(bitsPerBlock);
    uint256 byteIndex = bitIndex / 8;
    uint256 bitOffset = bitIndex % 8;
    uint256 mask = (1 << bitsPerBlock) - 1;
    uint256 byteOffset = dataStart + byteIndex;

    if (bitOffset + bitsPerBlock <= 8) {
      bytes memory data = pointer.read(byteOffset, byteOffset + 1);
      return (uint8(data[0]) >> bitOffset) & mask;
    } else {
      bytes memory data = pointer.read(byteOffset, byteOffset + 2);
      uint256 lowBits = 8 - bitOffset;
      uint256 low = uint8(data[0]) >> bitOffset;
      uint256 high = uint8(data[1]) & ((1 << (bitsPerBlock - lowBits)) - 1);
      return (low | (high << lowBits)) & mask;
    }
  }

  function _calculateBitsPerBlock(uint256 paletteSize) private pure returns (uint8) {
    if (paletteSize <= 1) return 0;
    return uint8((paletteSize - 1).fls() + 1);
  }

  // Public helper functions for encoding/decoding addresses
  function encodePointer(bytes memory compressedData) internal pure returns (address) {
    require(compressedData.length == 4, "Only 4-byte data can be encoded");

    // Encode the 4 bytes directly in the rightmost bytes of the address
    bytes memory addressBytes = new bytes(20);
    for (uint256 i = 0; i < 4; i++) {
      addressBytes[16 + i] = compressedData[i];
    }
    return address(uint160(bytes20(addressBytes)));
  }

  function isEncodedPointer(address pointer) internal view returns (bool) {
    return pointer != address(0) && pointer.code.length == 0;
  }

  function decodePointer(address pointer) internal pure returns (bytes memory) {
    // Extract the rightmost 4 bytes from the address
    bytes memory addressBytes = abi.encodePacked(pointer);
    bytes memory result = new bytes(4);
    for (uint256 i = 0; i < 4; i++) {
      result[i] = addressBytes[16 + i];
    }
    return result;
  }
}
