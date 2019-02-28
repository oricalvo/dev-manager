import {AppConfig, WorkspaceConfig} from "./dtos";
import {spawn} from "child_process";
import {BuildProxy} from "./proxy";

export function runApps(config: WorkspaceConfig, names: string[]) {
    for(const name of names) {
        const app = getApp(config, name);
        runApp(app);
    }
}

export async function killApps(config: WorkspaceConfig, names: string[]) {
    const proxy = new BuildProxy(config);
    await proxy.kill(names);
}

export function runApp(app: AppConfig) {
    spawn("node", [app.main], {
        stdio: "inherit",
        cwd: app.cwd,
    });
}

export function getApp(config: WorkspaceConfig, appName: string) {
    const app = config.apps.find(a => a.name.toLowerCase() == appName.toLowerCase());
    if(!app) {
        throw new Error("App with name " + appName + " was not found");
    }

    return app;
}

