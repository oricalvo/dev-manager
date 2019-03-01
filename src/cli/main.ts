#!/usr/bin/env node

import {createLogger} from "../common/logger";
import {AppDTO, AppStatus} from "../common/dtos";
import {BuildProxy} from "../common/proxy";
import {stopApps, restartApps, startApps} from "../common/common";
import {loadConfigFrom} from "../common/config";
import {DMError} from "../common/errors";
import * as moment from "moment";
import {spawn} from "child_process";
import * as path from "path";

const logger = createLogger();

export async function main() {
    try {
        const [cmd, ...args] = process.argv.slice(2);
        if(!cmd) {
            throw new DMError("Missing command");
        }

        if (cmd == "start") {
            await start(args);
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
        else {
            throw new Error("Unexpected command " + cmd);
        }
    }
    catch(err) {
        if(err instanceof DMError) {
            logger.error(err.message);
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
    if(!config.build) {
        throw new Error("build command is missing");
    }

    const [command, ...args] = config.build.split(" ");
    const info = path.parse(command);

    console.log("xxx", {
        cwd: path.resolve(config.basePath, info.dir),
        base: info.base,
    });

    spawn(info.base, args, {
        stdio: "inherit",
        shell: true,
        cwd: path.resolve(config.basePath, info.dir),
    });
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
