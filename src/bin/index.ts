import { FileHandle, open } from "fs/promises";
import { openFile, OpenFileResult } from "./head";
import { readLogic, writeLogic } from "./data";
import { optimize } from "./optimize";
import { removeCollection } from "./rm";

export interface CollectionMeta {
    name: string;
    offset: number;
    length: number;
    capacity: number;
}

export class BinManager {
    public fd: null | FileHandle = null;
    public openResult: OpenFileResult;

    constructor(public path: string) { }

    async open() {
        this.fd = await open(this.path, "w+");
        this.openResult = await openFile(this.fd);
    }

    async close() {
        if (this.fd) {
            await this.fd.close();
            this.fd = null;
        }
    }

    async write(collection: string, data: object[]) {
        if (!this.fd) throw new Error("File not open");
        await writeLogic(this.fd, this.openResult, collection, data);
    }

    async read(collection: string) {
        if (!this.fd) throw new Error("File not open");
        return await readLogic(this.fd, this.openResult, collection);
    }

    async optimize() {
        if (!this.fd) throw new Error("File not open");
        await optimize(this);
    }

    async removeCollection(collection: string) {
        if (!this.fd) throw new Error("File not open");
        await removeCollection(this.fd, this.openResult, collection);
    }
}