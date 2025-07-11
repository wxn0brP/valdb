import { Valthera } from "@wxn0brp/db";
import { OneFileAction } from "./actions";

const oneFileAction = new OneFileAction("./data.val");
await oneFileAction.init();
const db = new Valthera("", {
    dbAction: oneFileAction,
});

await db.add("user", { name: "John", age: 30 });

const user = await db.findOne("user", { name: "John" });
console.log(user);