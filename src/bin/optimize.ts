import { unlink } from "fs/promises";
import { BinManager } from ".";
import { saveHeaderAndPayload } from "./head";
import { HEADER_SIZE } from "./static";
import { readData, roundUpCapacity, writeData } from "./utils";

export async function optimize(cmp: BinManager) {
    const collections = cmp.openResult.collections;

    const allData = new Map<string, Buffer>();
    for (const { name, offset } of collections) {
        const len = await readData(cmp.fd, offset, 4);
        const data = await readData(cmp.fd, offset + 4, len.readInt32LE(0));
        allData.set(name, data);
    }

    await cmp.close();
    await unlink(cmp.path);
    await new Promise(resolve => setTimeout(resolve, 100));
    await cmp.open();

    let offset = roundUpCapacity(cmp.openResult, cmp.openResult.payloadLength + HEADER_SIZE) + cmp.openResult.blockSize;
    for (const [collection, data] of allData) {
        const len = roundUpCapacity(cmp.openResult, data.length + 4);
        const buf = Buffer.alloc(4);
        buf.writeInt32LE(len, 0);
        await writeData(cmp.fd, offset, buf, 4);
        await writeData(cmp.fd, offset + 4, data, len);
        cmp.openResult.collections.push({
            name: collection,
            offset,
            capacity: len
        });
        offset += len;
    }

    await saveHeaderAndPayload(cmp.fd, cmp.openResult);
}