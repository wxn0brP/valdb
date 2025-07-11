import { FileHandle } from "fs/promises";
import { OpenFileResult, saveHeaderAndPayload } from "./head";
import { CollectionMeta } from ".";
import { detectCollisions, pushToFreeList, readData, roundUpCapacity, writeData } from "./utils";
import { decodeData, encodeData } from "./format";

export function findCollection(result: OpenFileResult, name: string): CollectionMeta | undefined {
    return result.collections.find(c => c.name === name);
}

export async function findFreeSlot(result: OpenFileResult, size: number): Promise<OpenFileResult["freeList"][number] | undefined> {
    await _log("Finding free slot for size:", size);
    const idx = result.freeList.findIndex(f => f.capacity >= size);

    if (idx === -1) {
        await _log("No suitable free slot found.");
        return undefined;
    }

    const slot = result.freeList[idx];
    await _log("Free slot found at index:", idx, "with capacity:", slot.capacity);

    result.freeList.splice(idx, 1);
    await _log("Slot removed from freeList:", slot);

    return slot;
}

export async function writeLogic(fd: FileHandle, result: OpenFileResult, collection: string, data: object[]) {
    await _log("Writing data to collection:", collection);

    const existingCollection = findCollection(result, collection);
    const encoded = Buffer.from(await encodeData(data));
    const length = encoded.length;
    const capacity = roundUpCapacity(result, length + 4);

    let offset = existingCollection?.offset;
    let existingOffset = existingCollection?.offset;
    let existingCapacity = existingCollection?.capacity;

    const collision = detectCollisions(result, offset, capacity, [collection]);
    if (collision || !existingCollection) {
        if (collision) await _log("Collision detected");
        const slot = await findFreeSlot(result, capacity);
        if (slot) {
            offset = slot.offset;
            await _log("Found free slot at offset:", offset);
        } else {
            offset = result.fileSize;
            result.fileSize += capacity;
            await _log("No free slot found, appending at offset:", offset);
        }

        if (!existingCollection) {
            result.collections.push({ name: collection, offset, capacity });
        } else if (collision) {
            pushToFreeList(result, existingOffset, existingCapacity);
            result.collections = result.collections.map(c => {
                if (c.offset === existingOffset) return { name: c.name, offset, capacity };
                return c;
            })
        }

        await _log("Collection written");
        await saveHeaderAndPayload(fd, result);
    }

    const buf = Buffer.alloc(4);
    buf.writeInt32LE(length, 0);
    await writeData(fd, offset, buf, 4);
    await writeData(fd, offset + 4, encoded, capacity);

    if (existingCollection && length >= existingCollection.capacity) {
        result.collections = result.collections.map(c => {
            if (c.offset === offset) return { name: c.name, offset, capacity };
            return c;
        });
        await saveHeaderAndPayload(fd, result);
        await _log("Capacity exceeded");
    }
}

export async function readLogic(fd: FileHandle, result: OpenFileResult, collection: string) {
    const collectionMeta = findCollection(result, collection);
    if (!collectionMeta) throw new Error("Collection not found");

    const len = await readData(fd, collectionMeta.offset, 4);
    const data = await readData(fd, collectionMeta.offset + 4, len.readInt32LE(0));
    return await decodeData(data);
}