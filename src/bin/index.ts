import { access, FileHandle, constants as fsConstants, open } from "fs/promises";
import { readLogic, writeLogic } from "./data";
import { openFile, OpenFileResult } from "./head";
import { optimize } from "./optimize";
import { removeCollection } from "./rm";


async function safeOpen(path: string) {
    try {
        await access(path, fsConstants.F_OK);
        return await open(path, "r+");
    } catch {
        _log("Creating new file");
        return await open(path, "w+");
    }
}

export interface CollectionMeta {
    name: string;
    offset: number;
    capacity: number;
}

export class BinManager {
    public fd: null | FileHandle = null;
    public openResult: OpenFileResult;

    /**
     * Constructs a new BinManager instance.
     * @param path - File path.
     * @param [preferredSize=256] - The preferred block size for the database. Must be a positive number (preferredSize > 0)
     * @throws If the path is not provided, or the preferred size is
     * not a positive number.
     */
    constructor(public path: string, public preferredSize: number = 256) {
        if (!path) throw new Error("Path not provided");
        if (!preferredSize || preferredSize <= 0) throw new Error("Preferred size not provided");
    }

    async open() {
        this.fd = await safeOpen(this.path);
        this.openResult = await openFile(this.fd, this.preferredSize);
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