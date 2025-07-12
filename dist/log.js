const dir = process.cwd() + "/";
global.__wait = 0;
global._log = async function (level, ...data) {
    const logLevel = parseInt(process.env.LOG_LEVEL || '0', 10);
    if (logLevel < level)
        return;
    let line = new Error().stack.split('\n')[3].trim();
    let path = line.slice(line.indexOf("(")).replace(dir, "").replace("(", "").replace(")", "");
    const at = line.slice(3, line.indexOf("(") - 1);
    if (path.length < 2)
        path = line.replace(dir, "").replace("at ", ""); // if path is 2 (callback):
    console.log(`[${level}] ` + "\x1b[36m" + path + ":", "\x1b[33m" + at + "\x1b[0m", ...data);
    if (global.__wait)
        await new Promise(resolve => setTimeout(resolve, global.__wait));
};
