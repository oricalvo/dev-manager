#!/usr/bin/env node

import {createConsoleLogger, createLogger, LOGGER} from "../common/logger";
import {AppDTO, AppStatus} from "../common/dtos";
import {BuildProxy} from "../common/proxy";
import {restartApps, runApps, startApps, stopApps} from "../common/common";
import {loadConfigFrom} from "../common/config";
import {DMError} from "../common/errors";
import {spawn} from "child_process";
import * as path from "path";
import {delay, waitForEvent} from "../common/promise.helpers";
import {registerService} from "oc-tools/serviceLocator";
import {fileExists, readJSONFile} from "oc-tools/fs";

const logger = createLogger();

export async function main() {
    registerService(LOGGER, createConsoleLogger("dm"));

    try {
        const [cmd, ...args] = process.argv.slice(2);
        if(!cmd) {
            throw new DMError("Missing command");
        }

        if (cmd == "start") {
            await start(args);
        }
        else if (cmd == "run") {
            await run(args);
        }
        else if (cmd == "restart") {
            await restart(args);
        }
        else if (cmd == "list") {
            await list();
        }
        else if (cmd == "stop") {
            await stop(args);
        }
        else if (cmd == "build") {
            await build();
        }
        else if (cmd == "server") {
            await server(args);
        }
        else if (cmd == "version") {
            await version(args);
        }
        else {
            throw new Error("Unexpected command " + cmd);
        }
    }
    catch(err) {
        if(err instanceof DMError) {
            logger.error(err.message);
        }
        else if(err.code == "ECONNREFUSED") {
            logger.error("DM server is not available");
        }
        else if(err.statusCode && err.statusMessage) {
            logger.error(err.statusCode + " " + err.statusMessage);
        }
        else {
            logger.error(err);
        }
    }
}

async function start(args) {
    const appName = args[0];

    const config = await loadConfigFrom(process.cwd());
    const names = appName ? [appName] : undefined;

    await startApps(config, names);
    await list();
}

async function run(args) {
    //
    //  Run requested app inside current shell (not through dm server)
    //
    const appName = args[0];

    const config = await loadConfigFrom(process.cwd());
    const names = appName ? [appName] : undefined;

    await runApps(config, names);
}

async function restart(args) {
    const appName = args[0];

    const config = await loadConfigFrom(process.cwd());
    const names = appName ? [appName] : undefined;

    await restartApps(config, names);
    await list();
}

async function stop(args) {
    const appName = args[0];

    const config = await loadConfigFrom(process.cwd());
    const names = appName ? [appName] : undefined;

    await stopApps(config, names);
    await list();
}

async function build() {
    const config = await loadConfigFrom(process.cwd());
    const {build} = config;
    if(!build) {
        throw new Error("build configuration is missing");
    }

    logger.debug("Running build command:", build.command, "at", path.resolve(config.basePath, build.cwd));

    const proc = spawn(build.command, build.args, {
        stdio: "inherit",
        shell: true,
        cwd: path.resolve(config.basePath, build.cwd),
    });

    await waitForEvent(proc, "close", true);
}

async function server(args: string[]) {
    const cmd = args[0];
    if(cmd == "start" || !cmd) {
        await serverStart();
    }
    else if(cmd == "restart" || !cmd) {
        await serverRestart();
    }
    else if(cmd == "ping" || !cmd) {
        const res = await BuildProxy.alive();
        logger.debug(res);
    }
    else if(cmd == "stop") {
        await serverStop();
    }
    else {
        throw new DMError("Unknown command: " + cmd);
    }
}

async function version(args: string[]) {
    let packageJsonFilePath = path.resolve(__dirname, "../package.json");
    if(!await fileExists(packageJsonFilePath)) {
        packageJsonFilePath = path.resolve(__dirname, "./package.json");
    }

    if(!await fileExists(packageJsonFilePath)) {
        throw new Error("Failed to locate package.json");
    }

    const json = await readJSONFile(packageJsonFilePath);
    logger.debug("dm version " + json.version);
}

async function serverStart() {
    try {
        await BuildProxy.alive();
        throw new DMError("DM server is already running");
    }
    catch(err) {
        if(err.code == "ECONNREFUSED") {
            const mainFilePath = path.resolve(__dirname, "../server/main.js");
            logger.debug("Running DM server at: " + mainFilePath);
            const proc = spawn("node", [mainFilePath], {
                detached: true,
                stdio: "ignore",
            });
            logger.debug("DM PID is: " + proc.pid);
            proc.unref();

            return;
        }

        throw err;
    }
}

async function serverRestart() {
    await serverStop();
    await delay(1000);
    await serverStart();
}

async function serverStop() {
    try {
        await BuildProxy.shutdown();
    }
    catch(err) {
        if(err.code == "ECONNREFUSED") {
            return;
        }

        throw err;
    }
}

async function list() {
    const config = await loadConfigFrom(process.cwd());

    const proxy = new BuildProxy(config);
    const apps: AppDTO[] = await proxy.list(config.name);

    logger.debug();
    logger.debug("Name".padEnd(17, " ") + "Status".padEnd(10, " ") + "PID".padEnd(7, " ") + "Error".padEnd(10, " ") + "Ping".padEnd(10, " "));
    logger.debug("----".padEnd(17, " ") + "------".padEnd(10, " ") + "---".padEnd(7, " ") + "-----".padEnd(10, " ") + "----".padEnd(10, " "));
    for(const app of apps) {
        const name = app.name;
        const status = AppStatus[app.status].toString();
        const error = app.error || "";
        const pid = (app.pid || "").toString();
        const ping = app.ping || "";

        const line = name.padEnd(17, " ") + status.padEnd(10, " ") + pid.padEnd(7, " ") + error.padEnd(10, " ") + ping.padEnd(10, " ");
        logger.debug(line);
    }
}

main();
