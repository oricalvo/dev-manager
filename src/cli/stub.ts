#!/usr/bin/env node

import * as path from "path";
import {createConsoleLogger, createLogger, LOGGER} from "../common/logger";
import {fileExists} from "oc-tools/fs";
import {registerService} from "oc-tools/serviceLocator";

async function main() {
    let dir = process.cwd();

    while(true) {
        const mainFilePath = path.resolve(dir, "node_modules/dev-manager/bin/main.js");
        if(await fileExists(mainFilePath)) {
            console.log("Loading dm from " + mainFilePath);
            require(mainFilePath);
            return;
        }

        const parent = path.dirname(dir);
        if(parent == dir) {
            break;
        }

        dir = parent;
    }

    console.log("node_modules/dev-manager was not found");
}

main();
