import { findFreeSlot } from "./data.js";
import { decodeData, encodeData } from "./format.js";
import { HEADER_SIZE, VERSION } from "./static.js";
import { detectCollisions, pushToFreeList, roundUpCapacity, writeData } from "./utils.js";
import { getFileCrc } from "../crc32.js";
;
export async function openFile(fd, options) {
    const stats = await fd.stat();
    const fileSize = stats.size;
    await _log(2, "File size:", fileSize);
    const result = {
        collections: [],
        freeList: [],
        fileSize,
        payloadLength: 0,
        payloadOffset: 0,
        blockSize: options.preferredSize ?? 256,
        options
    };
    if (fileSize < HEADER_SIZE) {
        await _log(2, "Initializing new file header");
        await saveHeaderAndPayload(fd, result);
        await _log(6, "Header initialized with size:", HEADER_SIZE);
        return result;
    }
    const headerBuf = Buffer.alloc(HEADER_SIZE);
    await fd.read(headerBuf, 0, HEADER_SIZE, 0);
    await _log(6, "Header read from file");
    const version = headerBuf.readUInt32LE(0);
    if (version !== VERSION) {
        await _log(6, "err", `Unsupported file version: ${version}`);
        throw new Error(`Unsupported file version ${version}`);
    }
    await _log(2, "File version:", version);
    const payloadLength = headerBuf.readUInt32LE(4);
    result.payloadLength = payloadLength;
    await _log(6, "Payload length:", payloadLength);
    const payloadOffset = headerBuf.readUInt32LE(8);
    result.payloadOffset = payloadOffset;
    await _log(6, "Payload offset:", payloadOffset);
    const blockSize = headerBuf.readUInt32LE(12);
    result.blockSize = blockSize;
    await _log(2, "Block size:", blockSize);
    if (options.crc) {
        const { computedCrc, storedCrc } = await getFileCrc(fd);
        const validCrc = computedCrc === storedCrc || storedCrc === 0;
        await _log(2, "CRC:", computedCrc, "Needed CRC:", storedCrc, "Valid:", validCrc);
        if (storedCrc === 0) {
            await _log(1, "Warning: CRC is zero, CRC will not be checked");
        }
        if (!validCrc) {
            await _log(0, "err", "Invalid CRC");
            if (options.crc === 2)
                throw new Error("Invalid CRC");
        }
    }
    if (payloadOffset + payloadLength > fileSize - HEADER_SIZE) {
        await _log(6, "err", "Invalid payload length");
        throw new Error("Invalid payload length");
    }
    if (payloadLength === 0) {
        await _log(6, "Empty payload, initializing collections and freeList");
        return result;
    }
    await readHeaderPayload(fd, result);
    return result;
}
export async function readHeaderPayload(fd, result) {
    const { payloadLength, payloadOffset } = result;
    const payloadBuf = Buffer.alloc(payloadLength);
    const { bytesRead } = await fd.read(payloadBuf, 0, payloadLength, HEADER_SIZE + payloadOffset);
    await _log(6, `Payload header read, bytesRead: ${bytesRead}`);
    if (bytesRead < payloadLength) {
        await _log(6, "err", `Incomplete payload header read: expected ${payloadLength} bytes, got ${bytesRead}`);
        throw new Error(`Incomplete payload header read: expected ${payloadLength} bytes, got ${bytesRead}`);
    }
    const obj = await decodeData(payloadBuf);
    result.collections = (obj.c || []).map(([name, offset, length, capacity]) => ({ name, offset, length, capacity }));
    result.freeList = (obj.f || []).map(([offset, capacity]) => ({ offset, capacity }));
    await _log(6, "Collections and freeList loaded", result);
}
export function getHeaderPayload(result) {
    return {
        c: result.collections.map(({ name, offset, capacity }) => ([name, offset, capacity])),
        f: result.freeList.map(({ offset, capacity }) => [offset, capacity]),
    };
}
export async function saveHeaderAndPayload(fd, result, recursion = false) {
    if (!fd)
        throw new Error("File not open");
    const { collections, freeList, fileSize } = result;
    await _log(6, "Saving header payload:", collections, freeList);
    const payloadObj = getHeaderPayload(result);
    const payloadBuf = Buffer.from(await encodeData(payloadObj));
    if (payloadBuf.length > 64 * 1024) {
        console.error("Header payload too large");
        throw new Error("Header payload too large");
    }
    await _log(6, "Header payload length:", payloadBuf.length);
    const headerBuf = Buffer.alloc(HEADER_SIZE);
    headerBuf.writeUInt32LE(VERSION, 0);
    headerBuf.writeUInt32LE(payloadBuf.length, 4);
    headerBuf.writeUInt32LE(result.payloadOffset, 8);
    headerBuf.writeUInt32LE(result.blockSize, 12);
    result.payloadLength = payloadBuf.length;
    if (result.options.crc) {
        const { computedCrc: crc } = await getFileCrc(fd);
        headerBuf.writeUInt32LE(crc, 16);
    }
    // TODO add magic, flags, etc. here
    await _log(6, "Writing header:", headerBuf.toString("hex"));
    // Write header
    await fd.write(headerBuf, 0, HEADER_SIZE, 0);
    // Write payload
    const roundPayload = roundUpCapacity(result, payloadBuf.length);
    if (detectCollisions(result, HEADER_SIZE + result.payloadOffset, roundPayload)) {
        await _log(2, "Collision detected");
        const slot = !recursion && await findFreeSlot(result, roundPayload);
        if (slot) {
            result.payloadOffset = slot.offset - HEADER_SIZE;
        }
        else {
            result.payloadOffset = result.fileSize - HEADER_SIZE;
            result.fileSize += roundPayload;
        }
        pushToFreeList(result, result.payloadOffset, roundPayload);
        return await saveHeaderAndPayload(fd, result, true);
    }
    await writeData(fd, HEADER_SIZE + result.payloadOffset, payloadBuf, roundPayload);
    await _log(6, "Payload written");
    // Update file size if header + payload bigger
    result.fileSize = Math.max(fileSize, HEADER_SIZE + roundPayload);
}
