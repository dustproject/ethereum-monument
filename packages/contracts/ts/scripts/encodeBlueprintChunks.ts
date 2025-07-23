import type { ReadonlyVec3, Vec3 } from "@dust/world/internal";
import type { Hex } from "viem";
import { bytesToHex } from "viem";
import type { Block } from "./Block";

export interface Chunk {
  chunkCoord: ReadonlyVec3;
  blocks: Block[];
}

export interface EncodedChunk {
  chunkCoord: ReadonlyVec3;
  data: Hex;
}

// Constants
const CHUNK_SIZE = 16;
const VERSION = 0x01;

// Function to convert voxel coordinate to chunk coordinate
function toChunkCoord(coord: ReadonlyVec3): Vec3 {
  return [Math.floor(coord[0] / CHUNK_SIZE), Math.floor(coord[1] / CHUNK_SIZE), Math.floor(coord[2] / CHUNK_SIZE)];
}

function mod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

// Function to get relative position within a chunk
function getRelativeCoord(coord: ReadonlyVec3): Vec3 {
  return [mod(coord[0], CHUNK_SIZE), mod(coord[1], CHUNK_SIZE), mod(coord[2], CHUNK_SIZE)];
}

// Group voxels by chunk
export function groupByChunk(blocks: Block[]): Chunk[] {
  const chunks: Record<string, Chunk> = {};

  for (const block of blocks) {
    const chunkCoord = toChunkCoord(block.coord);
    const chunkKey = `${chunkCoord[0]},${chunkCoord[1]},${chunkCoord[2]}`;

    if (!chunks[chunkKey]) {
      chunks[chunkKey] = {
        chunkCoord,
        blocks: [],
      };
    }

    chunks[chunkKey].blocks.push(block);
  }

  return Object.values(chunks);
}

// Calculate bits needed for palette size
function calculateBitsPerBlock(paletteSize: number): number {
  if (paletteSize <= 1) return 0;
  if (paletteSize <= 2) return 1;
  if (paletteSize <= 4) return 2;
  if (paletteSize <= 8) return 3;
  if (paletteSize <= 16) return 4;
  if (paletteSize <= 32) return 5;
  if (paletteSize <= 64) return 6;
  if (paletteSize <= 128) return 7;
  return 8;
}

// Compute exact zero bytes for a given palette ordering
function computeExactZeroBytes(blockIndices: number[], bitsPerBlock: number): number {
  const totalBits = blockIndices.length * bitsPerBlock;
  const totalBytes = Math.ceil(totalBits / 8);
  const packedData = new Uint8Array(totalBytes);

  let bitIndex = 0;
  for (const index of blockIndices) {
    let bitsWritten = 0;
    while (bitsWritten < bitsPerBlock) {
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      const bitsInCurrentByte = 8 - bitOffset;
      const bitsToWrite = Math.min(bitsPerBlock - bitsWritten, bitsInCurrentByte);

      const mask = (1 << bitsToWrite) - 1;
      const shiftedValue = ((index >> bitsWritten) & mask) << bitOffset;
      packedData[byteIndex] |= shiftedValue;

      bitsWritten += bitsToWrite;
      bitIndex += bitsToWrite;
    }
  }

  let zeroBytes = 0;
  for (const byte of packedData) {
    if (byte === 0) zeroBytes++;
  }
  return zeroBytes;
}

// Generate all permutations for brute force search
function* permutations<T>(arr: T[]): Generator<T[]> {
  if (arr.length <= 1) {
    yield arr;
    return;
  }

  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      yield [arr[i], ...perm];
    }
  }
}

// Find optimal palette order for maximizing zero bytes
function findOptimalPaletteOrder(blockSequence: string[], uniqueBlocks: string[], bitsPerBlock: number): string[] {
  // For very small palettes (up to 7), use brute force
  if (uniqueBlocks.length <= 7) {
    // Map blocks to indices
    const blockToIndex = new Map<string, number>();
    uniqueBlocks.forEach((block, index) => {
      blockToIndex.set(block, index);
    });

    // Convert sequence to indices
    const indices = blockSequence.map((block) => blockToIndex.get(block)!);

    let bestPalette = uniqueBlocks;
    let bestZeroBytes = -1;

    // Try all permutations
    for (const perm of permutations(uniqueBlocks)) {
      // Create remapping for this permutation
      const remapping = new Map<number, number>();
      perm.forEach((block, newIndex) => {
        const oldIndex = blockToIndex.get(block)!;
        remapping.set(oldIndex, newIndex);
      });

      // Remap indices
      const remappedIndices = indices.map((idx) => remapping.get(idx)!);

      // Count zero bytes
      const zeroBytes = computeExactZeroBytes(remappedIndices, bitsPerBlock);

      if (zeroBytes > bestZeroBytes) {
        bestZeroBytes = zeroBytes;
        bestPalette = [...perm];
      }
    }

    return bestPalette;
  }

  // For larger palettes, use heuristic based on frequency and patterns
  const frequency = new Map<string, number>();
  for (const block of blockSequence) {
    frequency.set(block, (frequency.get(block) || 0) + 1);
  }

  return [...uniqueBlocks].sort((a, b) => (frequency.get(b) || 0) - (frequency.get(a) || 0));
}

// Pack bits into bytes
function packBits(indices: number[], bitsPerBlock: number): Uint8Array {
  const totalBits = indices.length * bitsPerBlock;
  const totalBytes = Math.ceil(totalBits / 8);
  const result = new Uint8Array(totalBytes);

  let bitIndex = 0;
  for (const index of indices) {
    let bitsWritten = 0;
    while (bitsWritten < bitsPerBlock) {
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      const bitsInCurrentByte = 8 - bitOffset;
      const bitsToWrite = Math.min(bitsPerBlock - bitsWritten, bitsInCurrentByte);

      const mask = (1 << bitsToWrite) - 1;
      const shiftedValue = ((index >> bitsWritten) & mask) << bitOffset;
      result[byteIndex] |= shiftedValue;

      bitsWritten += bitsToWrite;
      bitIndex += bitsToWrite;
    }
  }

  return result;
}

// Encode a chunk's data with palette compression
export function encodeChunk(chunk: Chunk): EncodedChunk {
  const totalBlocks = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;
  const blockData = new Uint8Array(totalBlocks * 3);

  // Create full chunk data
  for (const block of chunk.blocks) {
    if (block.id === undefined) {
      throw new Error("Block id is undefined");
    }
    const relativeCoord = getRelativeCoord(block.coord);
    const index = (relativeCoord[0] * CHUNK_SIZE * CHUNK_SIZE + relativeCoord[1] * CHUNK_SIZE + relativeCoord[2]) * 3;

    blockData[index] = (block.id >> 8) & 0xff;
    blockData[index + 1] = block.id & 0xff;
    blockData[index + 2] = block.orientation;
  }

  // Build palette with frequency tracking
  const frequency: Map<string, number> = new Map();
  const blockSequence: string[] = [];
  let firstBlockKey: string | null = null;
  let allSame = true;

  // First pass: count frequencies and track sequence
  for (let i = 0; i < totalBlocks; i++) {
    const offset = i * 3;
    const blockKey = `${blockData[offset]},${blockData[offset + 1]},${blockData[offset + 2]}`;

    blockSequence.push(blockKey);
    frequency.set(blockKey, (frequency.get(blockKey) || 0) + 1);

    if (firstBlockKey === null) {
      firstBlockKey = blockKey;
    } else if (blockKey !== firstBlockKey) {
      allSame = false;
    }
  }

  // Calculate bits per block to optimize palette ordering
  const paletteSize = frequency.size;
  const bitsPerBlock = calculateBitsPerBlock(paletteSize);

  // Optimize palette order based on bit alignment
  let optimalOrder: string[];

  if (paletteSize <= 8 && bitsPerBlock <= 3) {
    // For small palettes, find optimal order for zero bytes
    optimalOrder = findOptimalPaletteOrder(blockSequence, Array.from(frequency.keys()), bitsPerBlock);
  } else {
    // For larger palettes, use frequency-based ordering
    optimalOrder = Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([blockKey]) => blockKey);
  }

  // Build palette with optimal ordering
  const palette: Map<string, number> = new Map();
  const paletteArray: Uint8Array[] = [];

  optimalOrder.forEach((blockKey, index) => {
    palette.set(blockKey, index);
    const parts = blockKey.split(",");
    const blockData = new Uint8Array(3);
    blockData[0] = Number.parseInt(parts[0]);
    blockData[1] = Number.parseInt(parts[1]);
    blockData[2] = Number.parseInt(parts[2]);
    paletteArray.push(blockData);
  });

  // Create indices using optimized palette
  const indices: number[] = blockSequence.map((blockKey) => palette.get(blockKey)!);

  // Single block type encoding
  if (allSame && paletteArray.length > 0) {
    const result = new Uint8Array(4);
    result[0] = VERSION;
    result.set(paletteArray[0], 1);
    return {
      chunkCoord: chunk.chunkCoord,
      data: bytesToHex(result),
    };
  }

  // No trailing optimization - use full indices array

  // Palette encoding
  const finalPaletteSize = paletteArray.length;
  const finalBitsPerBlock = calculateBitsPerBlock(finalPaletteSize);
  const packedIndices = packBits(indices, finalBitsPerBlock);

  // Build final buffer: [version][paletteSize][palette...][packed indices...]
  const paletteBytes = finalPaletteSize * 3;
  const result = new Uint8Array(2 + paletteBytes + packedIndices.length);

  result[0] = VERSION;
  result[1] = finalPaletteSize;

  // Copy palette
  for (let i = 0; i < paletteArray.length; i++) {
    result.set(paletteArray[i], 2 + i * 3);
  }

  // Copy packed indices
  result.set(packedIndices, 2 + paletteBytes);

  return {
    chunkCoord: chunk.chunkCoord,
    data: bytesToHex(result),
  };
}

export function encodeBlueprintChunks(chunks: Chunk[]): EncodedChunk[] {
  return chunks.map(encodeChunk);
}
