declare var _log: (...data: any[]) => Promise<void>;

const dir = process.cwd() + "/";
global.__wait = 10
global._log = async function (...data) {
    let line = new Error().stack.split('\n')[3].trim();
    let path = line.slice(line.indexOf("(")).replace(dir, "").replace("(", "").replace(")", "");
    const at = line.slice(3, line.indexOf("(") - 1);

    if (path.length < 2) path = line.replace(dir, "").replace("at ", ""); // if path is 2 (callback):

    console.log("\x1b[36m" + path + ":", "\x1b[33m" + at + "\x1b[0m", ...data);
    await new Promise(resolve => setTimeout(resolve, global.__wait));
}