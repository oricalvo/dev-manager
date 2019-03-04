import * as path from "path";
import {fileExists, readJSONFile} from "oc-tools/fs";
import {createLogger} from "./logger";
import {WorkspaceConfig} from "./dtos";

const logger = createLogger();

export async function loadConfigFrom(dir: string): Promise<WorkspaceConfig> {
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
        config.basePath = dir;

        for(const app of config.apps) {
            if (!app.cwd) {
                app.cwd = config.basePath;
            }

            app.args = app.args || [];
        }

        return config;
    }
}

