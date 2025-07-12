import { saveHeaderAndPayload } from "./head.js";
import { findCollection } from "./data.js";
export async function removeCollection(fd, result, collection) {
    const collectionMeta = findCollection(result, collection);
    if (!collectionMeta)
        throw new Error("Collection not found");
    result.collections.splice(result.collections.findIndex(c => c.name === collection), 1);
    result.freeList.push({
        offset: collectionMeta.offset,
        capacity: collectionMeta.capacity
    });
    await saveHeaderAndPayload(fd, result);
}
