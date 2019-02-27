#!/usr/bin/env node

import {createConsoleLogger, createLogger, createWinstonLogger, LOGGER} from "./logger";
import {registerService} from "oc-tools/serviceLocator";
import {loadConfig} from "./config";
import {spawn} from "oc-tools/process";
import {buildProxy} from "./proxy";
import {BuildAppStatus} from "./dtos";

const logger = createLogger();

async function main() {
    registerService(LOGGER, createConsoleLogger("dm"));

    try {
        const args = process.argv.slice(2);
        const cmd = args[0];
        if(!cmd) {
            throw new Error("Missing command");
        }

        if (cmd == "list") {
            await list();
        }
        else {
            throw new Error("Unexpected command " + cmd);
        }
    }
    catch(err) {
        logger.error(err);
    }
}

async function list() {
    const config = await loadConfig();

    const apps = await buildProxy.getApps(config.worksapce);
    logger.debug("Apps");
    logger.debug("----");
    for(const app of apps) {
        const name = app.name;
        const status = BuildAppStatus[app.status].toString();
        const message = app.message || "";
        const error = app.error || "";
        const pid = (app.pid || "").toString();

        const line = name.padEnd(17, " ") + status.padEnd(10, " ") + pid.padEnd(7, " ") + message.padEnd(25, " ") + error.padEnd(10, " ");
        logger.debug(line);
    }
}

main();
