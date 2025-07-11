import { unlink } from "fs/promises";
import { BinManager } from ".";
import { saveHeaderAndPayload } from "./head";
import { HEADER_SIZE, SLOT_SIZE } from "./static";
import { readData, roundUpCapacity, writeData } from "./utils";

export async function optimize(cmp: BinManager) {
    const collections = cmp.openResult.collections;

    const allData = new Map<string, Buffer>();
    for (const { name, offset, length } of collections) {
        const data = await readData(cmp.fd, offset, length);
        allData.set(name, data);
    }

    await cmp.close();
    await unlink(cmp.path);
    await new Promise(resolve => setTimeout(resolve, 100));
    await cmp.open();

    let offset = roundUpCapacity(cmp.openResult.payloadLength + HEADER_SIZE) + SLOT_SIZE;
    for (const [collection, data] of allData) {
        const len = roundUpCapacity(data.length);
        await writeData(cmp.fd, offset, data, len);  
        offset += len;

        cmp.openResult.collections.push({
            name: collection,
            offset,
            length: data.length,
            capacity: len
        });
    }

    await saveHeaderAndPayload(cmp.fd, cmp.openResult);
}