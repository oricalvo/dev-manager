export interface BuildApp {
    name: string;
    status?: BuildAppStatus;
    pid?: number;
    message?: string;
    error?: string;
    port?: number;
}

export enum BuildAppStatus {
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
