import type { ExecutionContext } from '@cloudflare/workers-types';
import { http, type Hex, createPublicClient, sliceHex } from 'viem';
import { redstone } from 'viem/chains';
import { type ReadonlyVec3, decodeBlueprint, decodePointer, fromHexString } from './decodeBlueprint';

const version = 6;

const publicClient = createPublicClient({
	chain: redstone,
	transport: http(),
});

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Access-Control-Max-Age': '86400',
};

async function fetchPointer(coord: ReadonlyVec3) {
	const body = JSON.stringify([
		{
			address: '0x253eb85B3C953bFE3827CC14a151262482E7189C',
			query: `SELECT "pointer" FROM "eth_monument__BlueprintChunk" WHERE "x" = ${coord[0]} AND "y" = ${coord[1]} AND "z" = ${coord[2]};`,
		},
	]);
	const response = await fetch('https://indexer.mud.redstonechain.com/q', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
		},
		body,
	});

	const json = await response.json();
	const pointer = json.result[0]?.[1]?.[0];
	return pointer;
}

async function fetchBytecode(pointer: Hex) {
	const bytecode = await publicClient.getCode({
		address: pointer,
	});
	return bytecode;
}

async function decodePointerOrBytecode(coord: ReadonlyVec3, pointer: Hex, bytecode: Hex | undefined) {
	if (!bytecode) {
		return decodePointer(coord, pointer);
	}

	return decodeBlueprint(coord, fromHexString(sliceHex(bytecode, 1).replace('0x', '')));
}

export default {
	async fetch(request: Request, _env: unknown, ctx: ExecutionContext) {
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: corsHeaders,
			});
		}

		const url = new URL(request.url);
		const cache = (caches as unknown as { default: Cache }).default;
		const x = url.searchParams.get('x');
		const y = url.searchParams.get('y');
		const z = url.searchParams.get('z');
		const coord: ReadonlyVec3 = [Number(x), Number(y), Number(z)];

		if (!x || !y || !z) {
			return new Response('Missing x, y, or z', {
				status: 400,
				headers: corsHeaders,
			});
		}

		url.searchParams.sort();
		const cacheKey = new Request(`${url.toString()}?v=${version}`, request);
		let response = await cache.match(cacheKey);
		if (response) {
			return new Response(response.body, {
				...response,
				headers: {
					...response.headers,
					...corsHeaders,
					'X-Cache-Status': 'HIT',
				},
			});
		}

		const pointer = await fetchPointer(coord);
		if (!pointer) {
			return new Response('No pointer found', {
				status: 404,
				headers: corsHeaders,
			});
		}

		const bytecode = await fetchBytecode(pointer);
		const blueprint = await decodePointerOrBytecode(coord, pointer, bytecode);
		const formattedBlueprint = blueprint?.map(({ id, coord, orientation }) => ({
			objectTypeId: id,
			x: coord[0],
			y: coord[1],
			z: coord[2],
			orientation,
		}));

		response = new Response(JSON.stringify(formattedBlueprint), {
			status: 200,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=86400',
			},
		});

		ctx.waitUntil(cache.put(cacheKey, response.clone()));

		return new Response(response.body, {
			...response,
			headers: {
				...response.headers,
				...corsHeaders,
				'X-Cache-Status': 'MISS',
			},
		});
	},
};
