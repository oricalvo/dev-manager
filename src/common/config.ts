import * as path from "path";
import {fileExists, readJSONFile} from "oc-tools/fs";
import {createLogger} from "./logger";
import {BuildConfig, WorkspaceConfig} from "./dtos";

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
        const work: WorkspaceConfig = await readJSONFile(filePath);
        work.path = dir;
        work.projects = work.projects || [];

        for(const project of work.projects) {
            project.type = "project";

            if(!project.path && project.name) {
                project.path = "./" + project.name;
            }

            if(!project.path) {
                project.path = ".";
            }

            project.path = path.resolve(work.path, project.path);
            fixBuild(project.path, project.build);
            project.apps = project.apps || [];

            for(const app of project.apps) {
                if(!app.name) {
                    throw new Error("app.name is missing");
                }

                app.type = "app";

                if(!app.path && app.name) {
                    app.path = "./" + app.name;
                }

                if(!app.path) {
                    app.path = ".";
                }

                app.path = path.resolve(project.path, app.path);

                if(app.main) {
                    app.main = path.resolve(app.path, app.main);

                    if(!app.cwd) {
                        app.cwd = path.dirname(app.main);
                    }
                }

                if(app.log) {
                    app.log = path.resolve(app.path, app.log);
                }

                fixBuild(app.path, app.build);
                app.args = app.args || [];
            }
        }

        return work;
    }
}

function fixBuild(base: string, build: BuildConfig) {
    if(!build) {
        return;
    }

    if(!build.tsconfig) {
        build.tsconfig = "./tsconfig.json";
    }

    build.tsconfig = path.resolve(base, build.tsconfig);

    if(!build.tsc) {
        build.tsc = "./node_modules/.bin/tsc";
    }

    build.tsc = path.resolve(base, build.tsc);
}
