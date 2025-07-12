import { access, FileHandle, constants, open } from "fs/promises";
import { readLogic, writeLogic } from "./data";
import { openFile, OpenFileResult } from "./head";
import { optimize } from "./optimize";
import { removeCollection } from "./rm";
import { getFileCrc } from "../crc32";

async function safeOpen(path: string) {
    try {
        await access(path, constants.F_OK);
        return await open(path, "r+");
    } catch {
        _log(1, "Creating new file");
        return await open(path, "w+");
    }
}

export interface CollectionMeta {
    name: string;
    offset: number;
    capacity: number;
}

export interface Options {
    preferredSize: number;
    /**
     * 0 - crc off
     * 1 - warn if error
     * 2 - throw if error
     */
    crc: number;
}

export class BinManager {
    public fd: null | FileHandle = null;
    public openResult: OpenFileResult;
    public options: Options;

    /**
     * Constructs a new BinManager instance.
     * @param path - File path.
     * @param [preferredSize=256] - The preferred block size for the database. Must be a positive number (preferredSize > 0)
     * @throws If the path is not provided, or the preferred size is
     * not a positive number.
     */
    constructor(public path: string, options?: Partial<Options>) {
        if (!path) throw new Error("Path not provided");

        this.options = {
            preferredSize: 256,
            crc: 2,
            ...options
        }
        
        if (!this.options.preferredSize || this.options.preferredSize <= 0) throw new Error("Preferred size not provided");
    }

    async open() {
        this.fd = await safeOpen(this.path);
        this.openResult = await openFile(this.fd, this.options);
    }

    async close() {
        if (this.fd) {
            const buff = Buffer.alloc(8);
            if (this.options.crc) {
                const { computedCrc: crc } = await getFileCrc(this.fd);
                buff.writeUInt32LE(crc, 0);
            } else {
                buff.fill(0, 0, 8);
            }
            await this.fd.write(buff, 0, 8, 16);
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