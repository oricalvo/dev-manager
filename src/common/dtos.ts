import {ChildProcess} from "child_process";

export interface WorkspaceConfig {
    name: string;
    build: BuildConfig;
    apps: AppConfig[];
    basePath: string;
}

export interface BuildConfig {
    command: string;
    args: string[];
    cwd: string;
}

export interface AppConfig {
    name: string;
    main: string;
    cwd: string;
    args: string[];
    log: string;
}

export interface WorkspaceRuntime {
    name: string;
    config: WorkspaceConfig;
    apps: AppRuntime[];
}

export interface AppRuntime {
    name: string;
    config: AppConfig;
    status?: AppStatus;
    proc: ChildProcess;
    message?: string;
    error?: string;
    port?: number;
    ping: Date;
    color: (str: string) => string;
    pid: number;
    workspace: WorkspaceRuntime;
}

export enum AppStatus {
    None,
    Running,
    Stopped,
    Killed,
    Exited,
    Closed,
    Unknown,
}

export interface KillApps {
    names: string[];
}

export interface DebugApp {
    name: string;
}

export interface AppDTO {
    name: string;
    status: AppStatus;
    pid: number;
    error: string;
    port: number;
    ping: string;
    config: AppConfigDTO;
}

export interface AppConfigDTO {
    name: string;
    main: string;
    cwd: string;
    args: string[];
    log: string;
}

export interface PingDTO {
    cwd: string;
    pid: number;
}

export interface ExitDTO {
    cwd: string;
    error: string;
}

export interface StartDTO {
    cwd: string;
    names: string[];
}

export interface StopDTO {
    cwd: string;
    names: string[];
}

export interface ListDTO{
    cwd: string;
}

export interface GetAppDTO{
    cwd: string;
}
