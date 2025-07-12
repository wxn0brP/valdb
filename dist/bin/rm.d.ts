import { FileHandle } from "fs/promises";
import { OpenFileResult } from "./head.js";
export declare function removeCollection(fd: FileHandle, result: OpenFileResult, collection: string): Promise<void>;
