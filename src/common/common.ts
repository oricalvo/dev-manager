import {WorkspaceConfig} from "./dtos";
import {BuildProxy} from "./proxy";

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

