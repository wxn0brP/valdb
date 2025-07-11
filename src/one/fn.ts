import { encode, decode } from "@msgpack/msgpack";
import { readFile, writeFile } from "fs/promises";

export async function read(path: string): Promise<any> {
    const [file, collection] = JSON.parse(path);
    const allData = await readFile(file);
    const data = decode(allData);
    if (collection === null) return data;
    return data[collection] || [];
}

export async function write(path: string, data: any) {
    const [file, collection] = JSON.parse(path);
    let allData: any;
    try {
        const _allData = await readFile(file);
        allData = decode(_allData);
    } catch {
        allData = {};
    }
    if (collection === null) {
        const encoded = encode(allData);
        await writeFile(file, encoded);
        return;
    }

    allData[collection] = data;
    const encoded = encode(allData);
    await writeFile(file, encoded);
}