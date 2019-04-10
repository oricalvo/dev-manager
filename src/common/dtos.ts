import {ChildProcess} from "child_process";
import {ErrorCode} from "./errors";

export interface WorkspaceConfig {
    name: string;
    build: BuildConfig;
    projects: ProjectConfig[];
    path: string;
}

export interface ProjectConfig {
    type: "project";
    name: string;
    build: BuildConfig;
    apps: AppConfig[];
    path: string;
    disabled: boolean;
}

export interface AppConfig {
    type: "app";
    name: string;
    main: string;
    args: string[];
    log: string;
    build: BuildConfig;
    path: string;
    cwd: string;
    disabled: boolean;
}

export interface BuildConfig {
    name: string;
    path: string;
    tsconfig: string;
    tsc: string;
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
    stopped?: Date;
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
    Disabled,
    Dead,
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

export interface EnableDTO {
    cwd: string;
    names: string[];
    enable: boolean;
}

export interface ListDTO{
    cwd: string;
}

export interface GetAppDTO{
    cwd: string;
}

export interface ErrorDTO {
    message: string;
    errorCode: ErrorCode;
}