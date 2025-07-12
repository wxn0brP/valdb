import * as msgpack from "@msgpack/msgpack";

export async function encodeData(data: any) {
    if (process.env.USE_JSON !== "true") return msgpack.encode(data);
    _log(7, "[JSON]", "stringify", data);
    const string = JSON.stringify(data);
    return Buffer.from(string, "utf-8");
}

export async function decodeData(data: Buffer) {
    if (process.env.USE_JSON !== "true") return msgpack.decode(data);
    const string = data.toString("utf-8");
    _log(7, "[JSON]", "parsing", string);
    return JSON.parse(string);
}