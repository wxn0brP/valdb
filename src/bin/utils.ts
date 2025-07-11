import { FileHandle } from "fs/promises";
import { SLOT_SIZE } from "./static";
import { Block } from "./head";

export function roundUpCapacity(size: number) {
    return Math.ceil(size / SLOT_SIZE) * SLOT_SIZE;
}

export async function writeData(fd: FileHandle, offset: number, data: Buffer, capacity: number) {
    if (!fd) throw new Error("File not open");
    if (data.length > capacity) throw new Error("Data size exceeds capacity");

    await _log("Writing data at offset:", offset, "length:", data.length, "capacity:", capacity);

    const { bytesWritten } = await fd.write(data, 0, data.length, offset);
    await _log("Bytes written:", bytesWritten);

    if (data.length < capacity) {
        const pad = Buffer.alloc(capacity - data.length, 0);
        const padStart = offset + data.length;
        await _log("Padding with zeros:", pad.length, "at offset:", padStart);
        const { bytesWritten: padBytesWritten } = await fd.write(pad, 0, pad.length, padStart);
        await _log("Bytes written:", padBytesWritten);
    }

    await _log("Data written");
}

export async function readData(fd: FileHandle, offset: number, length: number): Promise<Buffer> {
    if (!fd) throw new Error("File not open");

    await _log("Reading data from offset:", offset, "length:", length);

    const buf = Buffer.alloc(length);
    const { bytesRead } = await fd.read(buf, 0, length, offset);

    await _log("Bytes read:", bytesRead);

    return buf;
}

export function optimizeFreeList(blocks: Block[]): Block[] {
    if (blocks.length <= 1) return blocks;

    const sorted = [...blocks].sort((a, b) => a.offset - b.offset);

    const merged: Block[] = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];

        if (current.offset + current.capacity === next.offset) {
            current = {
                offset: current.offset,
                capacity: current.capacity + next.capacity
            };
        } else {
            merged.push(current);
            current = next;
        }
    }

    merged.push(current);

    return merged;
}

function checkCollection(start1: number, end1: number, start2: number, end2: number) {
    _log("Checking collection:", start1, end1, start2, end2);
    return start1 < end2 && start2 < end1;
}

export function detectCollisions(result: any, start: number, size: number) {
    for (const { offset, capacity } of result.collections) 
        if (checkCollection(offset, offset + capacity, start, start + size)) 
            return true;

    return false;
}

export function pushToFreeList(result: any, offset: number, len: number) {
    result.freeList.push({
        offset,
        capacity: roundUpCapacity(len),
    });
    result.freeList = optimizeFreeList(result.freeList);
}