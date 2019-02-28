#!/usr/bin/env node

import {createConsoleLogger, createLogger, LOGGER} from "./logger";
import {registerService} from "oc-tools/serviceLocator";
import {loadConfig} from "./config";
import {AppStatus} from "./dtos";
import {BuildProxy} from "./proxy";
import {runApps} from "./common";

const logger = createLogger();

async function main() {
    registerService(LOGGER, createConsoleLogger("dm"));

    try {
        const args = process.argv.slice(2);
        const cmd = args[0];
        if(!cmd) {
            throw new Error("Missing command");
        }

        if (cmd == "start") {
            await start();
        }
        else if (cmd == "list") {
            await list();
        }
        else if (cmd == "kill") {
            await kill(args.slice(1));
        }
        else {
            throw new Error("Unexpected command " + cmd);
        }
    }
    catch(err) {
        logger.error(err);
    }
}

async function start() {
    const config = await loadConfig();

    await runApps(config.apps);
}

async function kill(args) {
    const appName = args[0];
    if(!appName) {
        throw new Error("appName is missing");
    }

    const config = await loadConfig();
    const proxy = new BuildProxy(config);
    await proxy.kill(appName);
}

async function list() {
    const config = await loadConfig();

    const proxy = new BuildProxy(config);
    const apps = await proxy.getApps();

    logger.debug("Name".padEnd(17, " ") + "Status".padEnd(10, " ") + "PID".padEnd(7, " ") + "Message".padEnd(25, " ") + "Error".padEnd(10, " "));
    logger.debug("----".padEnd(17, " ") + "------".padEnd(10, " ") + "---".padEnd(7, " ") + "-------".padEnd(25, " ") + "-----".padEnd(10, " "));
    for(const app of apps) {
        const name = app.name;
        const status = AppStatus[app.status].toString();
        const message = app.message || "";
        const error = app.error || "";
        const pid = (app.pid || "").toString();

        const line = name.padEnd(17, " ") + status.padEnd(10, " ") + pid.padEnd(7, " ") + message.padEnd(25, " ") + error.padEnd(10, " ");
        logger.debug(line);
    }
}

main();
