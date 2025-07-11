import { FileHandle } from "fs/promises";
import { CollectionMeta } from ".";
import { findFreeSlot } from "./data";
import { decodeData, encodeData } from "./format";
import { HEADER_SIZE, VERSION } from "./static";
import { detectCollisions, pushToFreeList, roundUpCapacity, writeData } from "./utils";

export interface Block {
    offset: number;
    capacity: number;
};

export interface OpenFileResult {
    collections: CollectionMeta[];
    freeList: Block[];
    fileSize: number;
    payloadLength: number;
    payloadOffset: number;
    blockSize: number;
}

export async function openFile(fd: FileHandle, preferredSize: number = 256) {
    const stats = await fd.stat();
    const fileSize = stats.size;
    await _log("File size:", fileSize);

    const result: OpenFileResult = {
        collections: [],
        freeList: [],
        fileSize,
        payloadLength: 0,
        payloadOffset: 0,
        blockSize: preferredSize
    }

    if (fileSize < HEADER_SIZE) {
        await _log("Initializing new file header");
        await saveHeaderAndPayload(fd, result);
        await _log("Header initialized with size:", HEADER_SIZE);
        return result;
    }

    const headerBuf = Buffer.alloc(HEADER_SIZE);
    await fd.read(headerBuf, 0, HEADER_SIZE, 0);
    await _log("Header read from file");

    const version = headerBuf.readUInt32LE(0);
    if (version !== VERSION) {
        await _log("err", `Unsupported file version: ${version}`);
        throw new Error(`Unsupported file version ${version}`);
    }
    await _log("File version:", version);

    const payloadLength = headerBuf.readUInt32LE(4);
    result.payloadLength = payloadLength;
    await _log("Payload length:", payloadLength);

    const payloadOffset = headerBuf.readUInt32LE(8);
    result.payloadOffset = payloadOffset;
    await _log("Payload offset:", payloadOffset);

    const blockSize = headerBuf.readUInt32LE(12);
    result.blockSize = blockSize;
    await _log("Block size:", blockSize);

    if (payloadOffset + payloadLength > fileSize - HEADER_SIZE) {
        await _log("err", "Invalid payload length");
        throw new Error("Invalid payload length");
    }

    if (payloadLength === 0) {
        await _log("Empty payload, initializing collections and freeList");
        return result;
    }

    await readHeaderPayload(fd, result);

    return result;
}

export async function readHeaderPayload(fd: FileHandle, result: OpenFileResult) {
    const { payloadLength, payloadOffset } = result;

    const payloadBuf = Buffer.alloc(payloadLength);
    const { bytesRead } = await fd.read(payloadBuf, 0, payloadLength, HEADER_SIZE + payloadOffset);
    await _log(`Payload header read, bytesRead: ${bytesRead}`);

    if (bytesRead < payloadLength) {
        await _log("err", `Incomplete payload header read: expected ${payloadLength} bytes, got ${bytesRead}`);
        throw new Error(`Incomplete payload header read: expected ${payloadLength} bytes, got ${bytesRead}`);
    }

    const obj = await decodeData(payloadBuf) as {
        c: [string, number, number, number][];
        f: [number, number][];
    };

    result.collections = (obj.c || []).map(([name, offset, length, capacity]) => ({ name, offset, length, capacity }));
    result.freeList = (obj.f || []).map(([offset, capacity]) => ({ offset, capacity }));

    await _log("Collections and freeList loaded", result);
}

export function getHeaderPayload(result: OpenFileResult) {
    return {
        c: result.collections.map(({ name, offset, capacity }) => ([name, offset, capacity])),
        f: result.freeList.map(({ offset, capacity }) => [offset, capacity]),
    };
}

export async function saveHeaderAndPayload(fd: FileHandle, result: OpenFileResult, recursion = false) {
    if (!fd) throw new Error("File not open");

    const { collections, freeList, fileSize } = result;
    await _log("Saving header payload:", collections, freeList);

    const payloadObj = getHeaderPayload(result);

    const payloadBuf = Buffer.from(await encodeData(payloadObj));
    if (payloadBuf.length > 64 * 1024) {
        console.error("Header payload too large");
        throw new Error("Header payload too large");
    }

    await _log("Header payload length:", payloadBuf.length);

    const headerBuf = Buffer.alloc(HEADER_SIZE);
    headerBuf.writeUInt32LE(VERSION, 0);
    headerBuf.writeUInt32LE(payloadBuf.length, 4);
    headerBuf.writeUInt32LE(result.payloadOffset, 8);
    headerBuf.writeUInt32LE(result.blockSize, 12);
    result.payloadLength = payloadBuf.length;

    // TODO add magic, flags, etc. here

    await _log("Writing header:", headerBuf.toString("hex"));

    // Write header
    await fd.write(headerBuf, 0, HEADER_SIZE, 0);
    // Write payload
    const roundPayload = roundUpCapacity(result, payloadBuf.length);

    if (detectCollisions(result, HEADER_SIZE + result.payloadOffset, roundPayload)) {
        await _log("Collision detected");
        const slot = !recursion && await findFreeSlot(result, roundPayload);
        if (slot) {
            result.payloadOffset = slot.offset - HEADER_SIZE;
        } else {
            result.payloadOffset = result.fileSize - HEADER_SIZE;
            result.fileSize += roundPayload;
        }
        pushToFreeList(result, result.payloadOffset, roundPayload);

        return await saveHeaderAndPayload(fd, result, true);
    }

    await writeData(fd, HEADER_SIZE + result.payloadOffset, payloadBuf, roundPayload);

    await _log("Payload written");

    // Update file size if header + payload bigger
    result.fileSize = Math.max(fileSize, HEADER_SIZE + roundPayload);
}