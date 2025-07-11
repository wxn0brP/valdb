import { Valthera } from "@wxn0brp/db";
import { rm } from "fs/promises";
import { BinFileAction } from "./actions";
import "./log";
import { BinManager } from "./bin";
process.env.USE_JSON = "true";
process.env.USE_LOG = "true";

await rm("data.val", { force: true });

const mgr = new BinManager("./data.val", 256);
const dbAction = new BinFileAction(mgr);
await dbAction.init();
const db = new Valthera("", { dbAction });

await db.add("user", { name: "John", age: 30 });

await db.updateOne("user", { name: "John" }, { age: 31 });

console.log(await db.findOne("user", { name: "John" }));

await new Promise((resolve) => setTimeout(resolve, 1000));

// mgr.preferredSize = 256;
// await mgr.optimize();

console.log(await db.find("user", { name: "John" }));