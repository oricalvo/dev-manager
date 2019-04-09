import {AppConfig, AppRuntime, BuildConfig, ProjectConfig, WorkspaceConfig, WorkspaceRuntime} from "./dtos";
import {BuildProxy} from "./proxy";
import {spawn} from "child_process";
import * as path from "path";
import {DMError} from "./errors";

export async function startApps(config: WorkspaceConfig, names: string[]) {
    const proxy = new BuildProxy(config);
    await proxy.start(names);
}

export async function restartApps(config: WorkspaceConfig, names: string[]) {
    const proxy = new BuildProxy(config);
    await proxy.restart(names);
}

export async function stopApps(config: WorkspaceConfig, names: string[]) {
    const proxy = new BuildProxy(config);
    await proxy.stop(names);
}

export async function enableApps(config: WorkspaceConfig, names: string[], enable: boolean) {
    const proxy = new BuildProxy(config);
    await proxy.enable(names, enable);
}

export function runApps(config: WorkspaceConfig, names: string[]) {
    for(const name of names) {
        const app = getAppConfig(config, name);

        const cwd = getAppWorkingDirectory(config, app);

        const proc = spawn("node", [app.main, ...app.args], {
            cwd,
            stdio: "inherit",
        });
    }
}

export function getAppWorkingDirectory(worksapce: WorkspaceConfig, app: AppConfig) {
    let cwd = app.cwd;

    if(!cwd) {
        cwd = path.dirname(app.main);
    }

    const res = path.resolve(worksapce.path, app.path, app.cwd);
    return res;
}

export function getAppConfig(workspace: WorkspaceConfig, appName: string): AppConfig {
    for(const project of workspace.projects) {
        for(const app of project.apps) {
            if(app.name.toLowerCase() == appName.toLowerCase()) {
                return app;
            }
        }
    }

    throw new Error("App config with name " + appName + " was not found");
}

export function getBuildConfig(workspace: WorkspaceConfig, name: string): ProjectConfig|AppConfig {
    const project = findProjectConfig(workspace, name);
    if (project && project.build) {
        return project;
    }

    const app = findAppConfig(workspace, name);
    if(app && app.build) {
        return app;
    }

    throw new Error("Build config with name " + name + " was not found");
}

function findProjectConfig(work: WorkspaceConfig, name: string): ProjectConfig {
    for(const project of work.projects) {
        if(project.name && project.name.toLowerCase() == name.toLowerCase()) {
            return project;
        }
    }

    return null;
}

function findAppConfig(work: WorkspaceConfig, name: string): AppConfig {
    for(const project of work.projects) {
        for(const app of project.apps) {
            if(app.name.toLowerCase() == name.toLowerCase() && app.build) {
                return app;
            }
        }
    }

    return null;
}

function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

export function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

export function resolveAppNames(work: WorkspaceConfig, names: string[]): string[] {
    const res = new Set<string>();

    for(const name of names) {
        if(name == "all") {
            for(const project of work.projects) {
                for (const app of project.apps) {
                    res.add(app.name);
                }
            }

            continue;
        }

        res.add(name);
    }

    if(!res.size) {
        throw new DMError("App name is missing");
    }

    return Array.from(res.keys());
}

export function resolveBuildNames(work: WorkspaceConfig, names: string[]): (AppConfig|ProjectConfig)[] {
    const res = new Set<AppConfig|ProjectConfig>();

    for(const name of names) {
        if(name == "all") {
            for(const project of work.projects) {
                if(project.build) {
                    res.add(project);
                }

                for (const app of project.apps) {
                    if(app.build) {
                        res.add(app);
                    }
                }
            }
        }
        else {
            res.add(getBuildConfig(work, name));
        }
    }

    if(!res.size) {
        throw new DMError("App name is missing");
    }

    return Array.from(res.keys());
}