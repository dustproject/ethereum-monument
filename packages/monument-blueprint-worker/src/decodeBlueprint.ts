import type { Address, Hex } from 'viem';
import { hexToBytes } from 'viem';

export type Vec3 = [x: number, y: number, z: number];
export type ReadonlyVec3 = Readonly<Vec3>;
export type Block = {
	coord: ReadonlyVec3;
	id: number;
	orientation: number;
};

export function fromHexString(hexString: string): Uint8Array {
	return Uint8Array.from(hexString.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []);
}

// Constants
const CHUNK_SIZE = 16;
const VERSION = 0x01;

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

// Function to convert chunk coordinate back to world coordinate
function fromChunkCoord(chunkCoord: ReadonlyVec3, relativeCoord: Vec3): Vec3 {
	return [
		chunkCoord[0] * CHUNK_SIZE + relativeCoord[0],
		chunkCoord[1] * CHUNK_SIZE + relativeCoord[1],
		chunkCoord[2] * CHUNK_SIZE + relativeCoord[2],
	];
}

// Extract bits from packed data
function extractBits(data: Uint8Array, bitIndex: number, bitsPerBlock: number): number {
	let result = 0;
	let bitsRead = 0;

	while (bitsRead < bitsPerBlock) {
		const byteIndex = Math.floor((bitIndex + bitsRead) / 8);

		// If we've run out of data, return 0
		if (byteIndex >= data.length) {
			break;
		}

		const bitOffset = (bitIndex + bitsRead) % 8;
		const bitsInCurrentByte = 8 - bitOffset;
		const bitsToRead = Math.min(bitsPerBlock - bitsRead, bitsInCurrentByte);

		const mask = (1 << bitsToRead) - 1;
		const value = (data[byteIndex] >> bitOffset) & mask;
		result |= value << bitsRead;

		bitsRead += bitsToRead;
	}

	return result;
}

// Function to decode a blueprint's data
export function decodeBlueprint(chunkCoord: ReadonlyVec3, data: Hex | Uint8Array): Block[] {
	const blocks: Block[] = [];

	// Convert Hex to Uint8Array if needed
	const bytes = typeof data === 'string' ? hexToBytes(data) : data;

	if (bytes.length < 1) {
		return blocks;
	}

	// Read header
	const version = bytes[0];

	// Check version
	if (version !== VERSION) {
		throw new Error(`Unsupported blueprint encoding version: 0x${version.toString(16).padStart(2, '0')}`);
	}

	// Single block type encoding (4 bytes total)
	if (bytes.length === 4) {
		const id = (bytes[1] << 8) | bytes[2];
		const orientation = bytes[3];

		// Fill entire chunk with this block
		for (let x = 0; x < CHUNK_SIZE; x++) {
			for (let y = 0; y < CHUNK_SIZE; y++) {
				for (let z = 0; z < CHUNK_SIZE; z++) {
					const worldCoord = fromChunkCoord(chunkCoord, [x, y, z]);
					blocks.push({
						coord: worldCoord,
						id,
						orientation,
					});
				}
			}
		}

		return blocks;
	}

	// Palette encoding

	if (bytes.length < 2) {
		throw new Error('Invalid palette encoding: insufficient header');
	}

	const paletteSize = bytes[1];
	const bitsPerBlock = calculateBitsPerBlock(paletteSize);

	// Read palette
	const paletteStart = 2;
	const paletteEnd = paletteStart + paletteSize * 3;

	if (bytes.length < paletteEnd) {
		throw new Error('Invalid palette encoding: insufficient palette data');
	}

	const palette: Array<{ id: number; orientation: number }> = [];
	for (let i = 0; i < paletteSize; i++) {
		const offset = paletteStart + i * 3;
		const id = (bytes[offset] << 8) | bytes[offset + 1];
		const orientation = bytes[offset + 2];
		palette.push({ id, orientation });
	}

	// Read packed indices
	const packedData = bytes.slice(paletteEnd);

	// Decode each block
	for (let x = 0; x < CHUNK_SIZE; x++) {
		for (let y = 0; y < CHUNK_SIZE; y++) {
			for (let z = 0; z < CHUNK_SIZE; z++) {
				const blockIndex = x * CHUNK_SIZE * CHUNK_SIZE + y * CHUNK_SIZE + z;
				const paletteIndex = extractBits(packedData, blockIndex * bitsPerBlock, bitsPerBlock);

				const worldCoord = fromChunkCoord(chunkCoord, [x, y, z]);

				if (paletteIndex < paletteSize) {
					const { id, orientation } = palette[paletteIndex];
					blocks.push({
						coord: worldCoord,
						id,
						orientation,
					});
				} else {
					// Invalid palette index - use null block
					blocks.push({
						coord: worldCoord,
						id: 0,
						orientation: 0,
					});
				}
			}
		}
	}

	return blocks.filter((block) => block.id !== 0); // Filter out null blocks
}

// Function to decode from an address pointer (for single-type encoding)
export function decodePointer(chunkCoord: ReadonlyVec3, pointer: Address): Block[] {
	// Convert hex string to bigint
	const addr = BigInt(pointer);

	// Check if pointer is zero address
	if (addr === 0n) {
		return [];
	}

	// Extract the low 32 bits from the address
	const low32 = addr & 0xffffffffn;

	// Extract individual bytes from the packed data
	const version = Number((low32 >> 24n) & 0xffn);
	const idHigh = Number((low32 >> 16n) & 0xffn);
	const idLow = Number((low32 >> 8n) & 0xffn);
	const orientation = Number(low32 & 0xffn);

	// Check version
	if (version !== VERSION) {
		throw new Error(`Unsupported blueprint encoding version: 0x${version.toString(16).padStart(2, '0')}`);
	}

	// Create the 4-byte data array and use existing decoder
	const data = new Uint8Array([version, idHigh, idLow, orientation]);
	return decodeBlueprint(chunkCoord, data);
}
