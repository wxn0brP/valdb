import { FileHandle } from "fs/promises";
import { CollectionMeta, Options } from "./index.js";
export interface Block {
    offset: number;
    capacity: number;
}
export interface OpenFileResult {
    collections: CollectionMeta[];
    freeList: Block[];
    fileSize: number;
    payloadLength: number;
    payloadOffset: number;
    blockSize: number;
    options: Options;
}
export declare function openFile(fd: FileHandle, options: Options): Promise<OpenFileResult>;
export declare function readHeaderPayload(fd: FileHandle, result: OpenFileResult): Promise<void>;
export declare function getHeaderPayload(result: OpenFileResult): {
    c: (string | number)[][];
    f: number[][];
};
export declare function saveHeaderAndPayload(fd: FileHandle, result: OpenFileResult, recursion?: boolean): Promise<void>;
