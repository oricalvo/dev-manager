export interface WorkspaceConfig {
    name: string;
    apps: AppConfig[];
}

export interface AppConfig {
    name: string;
    main: string;
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
    pid?: number;
    message?: string;
    error?: string;
    port?: number;
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
    message: string;
    error: string;
    port: number;
}

export interface PingDTO {
    pid: number;
    port: number;
}
