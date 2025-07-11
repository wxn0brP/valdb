import { FileHandle } from "fs/promises";
import { OpenFileResult, saveHeaderAndPayload } from "./head";
import { findCollection } from "./data";

export async function removeCollection(fd: FileHandle, result: OpenFileResult, collection: string) {
    const collectionMeta = findCollection(result, collection);
    if (!collectionMeta) throw new Error("Collection not found");

    result.collections.splice(result.collections.findIndex(c => c.name === collection), 1);
    result.freeList.push({
        offset: collectionMeta.offset,
        capacity: collectionMeta.capacity
    })
    await saveHeaderAndPayload(fd, result);
}