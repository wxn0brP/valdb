import { FileHandle } from "fs/promises";
import { OpenFileResult } from "./head.js";
import { CollectionMeta } from "./index.js";
export declare function findCollection(result: OpenFileResult, name: string): CollectionMeta | undefined;
export declare function findFreeSlot(result: OpenFileResult, size: number): Promise<OpenFileResult["freeList"][number] | undefined>;
export declare function writeLogic(fd: FileHandle, result: OpenFileResult, collection: string, data: object[]): Promise<void>;
export declare function readLogic(fd: FileHandle, result: OpenFileResult, collection: string): Promise<any>;
