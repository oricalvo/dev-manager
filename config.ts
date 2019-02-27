import * as path from "path";
import {fileExists, readJSONFile} from "oc-tools/fs";
import {createLogger} from "./logger";

const logger = createLogger();

export interface Config {
    worksapce: string;
}

export async function loadConfig(): Promise<Config> {
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

        const config: Config = await readJSONFile(filePath);
        return config;
    }
}

