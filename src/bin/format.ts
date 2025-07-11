import * as msgpack from "@msgpack/msgpack";

const isDev = process.env.NODE_ENV === "development";

export async function encodeData(data: any) {
    if (!isDev) return msgpack.encode(data);
    // _log("[JSON]", "stringify", data);
    // await new Promise(resolve => setTimeout(resolve, 3000));
    const string = JSON.stringify(data);
    return Buffer.from(string);
}

export async function decodeData(data: Buffer) {
    if (!isDev) return msgpack.decode(data);
    const string = data.toString();
    // _log("[JSON]", "paring", string);
    return JSON.parse(string);
}