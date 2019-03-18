import {AppConfig, AppRuntime, WorkspaceConfig} from "./dtos";
import {BuildProxy} from "./proxy";
import {spawn} from "child_process";
import * as path from "path";

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
    if(app.cwd) {
        const res = path.resolve(worksapce.basePath, app.cwd);
        return res;
    }

    const res = process.cwd();
    return res;
}

export function getAppConfig(workspace: WorkspaceConfig, appName: string): AppConfig {
    const app = workspace.apps.find(a => a.name.toLowerCase() == appName.toLowerCase());
    if(!app) {
        throw new Error("App config with name " + appName + " was not found");
    }

    return app;
}

function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

export function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}
