#!/usr/bin/env node

import {createConsoleLogger, createLogger, LOGGER} from "./logger";
import {registerService} from "oc-tools/serviceLocator";
import {AppStatus} from "./dtos";
import {BuildProxy} from "./proxy";
import {killApps, runApps} from "./common";
import {loadConfigFrom} from "./config";

const logger = createLogger();

async function main() {
    registerService(LOGGER, createConsoleLogger("dm"));

    try {
        const [cmd, ...args] = process.argv.slice(2);
        if(!cmd) {
            throw new Error("Missing command");
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
        else if (cmd == "kill") {
            await kill(args);
        }
        else {
            throw new Error("Unexpected command " + cmd);
        }
    }
    catch(err) {
        logger.error(err);
    }
}

async function start(args) {
    const appName = args[0];

    const config = await loadConfigFrom(process.cwd());

    const names = appName ? [appName] : config.apps.map(a=>a.name);

    runApps(config, names);
}

async function restart(args) {
    const appName = args[0];

    const config = await loadConfigFrom(process.cwd());
    const names = appName ? [appName] : config.apps.map(a=>a.name);

    await killApps(config, names);

    runApps(config, names);
}

async function kill(args) {
    const appName = args[0];

    const config = await loadConfigFrom(process.cwd());
    const names = appName ? [appName] : config.apps.map(a=>a.name);

    killApps(config, names);
}

async function list() {
    const config = await loadConfigFrom(process.cwd());

    const proxy = new BuildProxy(config);
    const apps = await proxy.list();

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
