import { rm } from "fs/promises";
import "./log";
import { BinManager } from "./bin";
process.env.USE_JSON = "true";
process.env.USE_LOG = "true";

await rm("db.val", { force: true });
await new Promise((resolve) => setTimeout(resolve, 1000));
const ll = () => _log("_".repeat(30))

const db = new BinManager("db.val");
await db.open();
ll();

await db.write("users", [{ id: 10, title: "Hello" }]);
await db.write("posts", [{ id: 10, title: "Hello" }]);
await db.write("users", [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }, { id: 3, name: "Charlie" }]);
await db.write("posts", [{ id: 10, title: "Hello" }, { id: 20, title: "World" }]);
ll()

console.log(await db.read("users"));
console.log(await db.read("posts"));
ll()

await db.removeCollection("posts");

ll();
await db.optimize();

await db.close();
