import {registerService} from "oc-tools/serviceLocator";
import {createLogger, createWinstonLogger, LOGGER} from "./logger";
import {copyFile, copyGlob, deleteDirectory} from "oc-tools/fs";
import {spawn} from "oc-tools/process";

const logger = createLogger("main");

registerService(LOGGER, createWinstonLogger("build.log", true, "build"));

export async function dev() {
    spawn("node", ["server.js"], {
        cwd: "./dist"
    });
}

export async function pack() {
    logger.debug("Creating npm package");

    await deleteDirectory("./package");

    await copyGlob("./dist/*.js", "./package");
    await copyGlob("./dist/*.d.ts", "./package");
    await copyFile("./package.json", "package/package.json");
}

export async function patch() {
    await pack();

    await spawn("npm", ["version", "patch"], {
        cwd: "./package",
    });

    await spawn("npm", ["publish"], {
        cwd: "./package",
    });

    await copyFile("package/package.json", "./package.json");
}
