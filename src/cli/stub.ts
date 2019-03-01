#!/usr/bin/env node

import * as path from "path";
import {createConsoleLogger, createLogger, LOGGER} from "../common/logger";
import {fileExists} from "oc-tools/fs";
import {registerService} from "oc-tools/serviceLocator";

const logger = createLogger();

async function main() {
    registerService(LOGGER, createConsoleLogger("dm"));

    let dir = process.cwd();

    while(true) {
        const mainFilePath = path.resolve(dir, "node_modules/dev-manager/bin/main.js");
        if(await fileExists(mainFilePath)) {
            logger.debug("Loading dm from " + mainFilePath);
            require(mainFilePath);
            return;
        }

        const parent = path.dirname(dir);
        if(parent == dir) {
            break;
        }

        dir = parent;
    }

    logger.debug("node_modules/dev-manager was not found");
}

main();
