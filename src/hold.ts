import readline from "readline";

export async function waitToContinue() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    await new Promise((resolve) => rl.question("Press enter to continue...", resolve));
    rl.close();
}