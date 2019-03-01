import {registerService} from "oc-tools/serviceLocator";
import {createLogger, createWinstonLogger, LOGGER} from "../src/common/logger";
import {copyFile, copyGlob, deleteDirectory, ensureDirectory} from "oc-tools/fs";
import {spawn} from "oc-tools/process";

const logger = createLogger("main");

registerService(LOGGER, createWinstonLogger("build.log", true, "build"));

export async function dev() {
    spawn("node", ["main.js"], {
        cwd: "./dist/src/server"
    });
}

export async function pack() {
    logger.debug("Creating npm package");

    await deleteDirectory("./package");

    await copyGlob("./dist/src/**/*.*", "./package");

    await ensureDirectory("./package/bin");
    await copyGlob("./dist/src/cli/*.js", "./package/bin");
    await deleteDirectory("./package/cli");

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
