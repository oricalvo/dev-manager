import * as path from "path";
import {fileExists, readJSONFile} from "oc-tools/fs";
import {createLogger} from "./logger";
import {WorkspaceConfig} from "./dtos";

const logger = createLogger();

export interface Config {
    worksapce: string;
}

export async function loadConfig(): Promise<WorkspaceConfig> {
    let dir = process.cwd();

    while(true) {
        const filePath = path.resolve(dir, "dm.conf");
        if(!await fileExists(filePath)) {
            const parent = path.dirname(dir);
            if(dir == parent) {
                throw new Error("dm.conf file was not found");
            }

            dir = parent;

            continue;
        }

        logger.debug("Loading configuration from " + filePath);
        const config: WorkspaceConfig = await readJSONFile(filePath);
        logger.debug("    workspace: " + config.name);
        return config;
    }
}

