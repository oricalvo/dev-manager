import * as express from "express";
import {createLogger, createWinstonLogger, LOGGER} from "./logger";
import {promisifyExpressApi} from "./express.helpers";
import * as bodyParser from "body-parser";
import {AppDTO, AppRuntime, AppStatus, ExitDTO, PingDTO, WorkspaceConfig, WorkspaceRuntime} from "./dtos";
import {registerService} from "oc-tools/serviceLocator";
import {spawn} from "child_process";
import {Mapper_App_AppDTO} from "./mappers";

const logger = createLogger();

const workspaces = new Map<string, WorkspaceRuntime>();

export function main() {
    registerService(LOGGER, createWinstonLogger("dm.log", true, "dm"));

    const app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.text());

    app.post("/api/:workspace/start", promisifyExpressApi(startWorkspace));
    app.get("/api/:workspace/app", promisifyExpressApi(getApps));
    app.post("/api/:workspace/:app/ping", promisifyExpressApi(pingApp));
    app.post("/api/:workspace/:app/exit", promisifyExpressApi(exitApp));
    app.post("/api/:workspace/:app/kill", promisifyExpressApi(killApp));
    // app.post("/api/:worksapce/app/:name/init", promisifyExpressApi(initApp));
    // app.post("/api/app/restart", promisifyExpressApi(restartApps));
    // app.post("/api/app/debug", promisifyExpressApi(debugApp));

    // watchFS();

    app.listen(7070, function () {
        logger.debug("Server is running on port 7070");
    });
}

async function startWorkspace(req): Promise<AppDTO[]> {
    logger.debug("getApps");

    const name = req.params.workspace;
    if(!name) {
        throw new Error("workspace parameter is missing");
    }

    const config: WorkspaceConfig = req.body;

    const work = getOrCreateWorkspace(name);

    for(const app of work.apps) {
        runApp(app);
    }

    return work.apps.map(Mapper_App_AppDTO);
}

async function getApps(req): Promise<AppDTO[]> {
    logger.debug("getApps");

    const name = req.params.workspace;
    if(!name) {
        throw new Error("workspace parameter is missing");
    }

    const work = getOrCreateWorkspace(name);

    return Array.from(work.apps.values()).map(app => ({
        name: app.name,
        status: app.status,
        pid: app.pid,
        message: app.message,
        error: app.error,
        port: app.port,
    }));
}

// async function initApp(req) {
//     logger.debug("initApp", req.body);
//
//     const name = req.params.name;
//     if(!name) {
//         throw new Error("name is missing");
//     }
//
//     const app = getApp(name);
//
//     const body: App = req.body;
//     if(!body.pid) {
//         throw new Error("pid is missing");
//     }
//
//     app.status = AppStatus.Running;
//     app.port = body.port;
//     app.pid = body.pid;
//
//     app.message = "Init ack received";
// }

async function pingApp(req) {
    logger.debug("ping", req.body);

    const workspaceName = req.params.workspace;
    if(!workspaceName) {
        throw new Error("workspace is missing");
    }

    const appName = req.params.app;
    if(!appName) {
        throw new Error("app is missing");
    }

    const body: PingDTO = req.body;
    if(!body.pid) {
        throw new Error("pid is missing");
    }

    const app = getOrCreateApp(workspaceName, appName);
    app.status = AppStatus.Running;
    app.port = body.port;
    app.pid = body.pid;
    app.error = null;

    app.message = "Ping ack received";
}

async function exitApp(req) {
    logger.debug("exit", req.params.name, req.body);

    const workspaceName = req.params.workspace;
    if(!workspaceName) {
        throw new Error("workspace is missing");
    }

    const appName = req.params.app;
    if(!appName) {
        throw new Error("app is missing");
    }

    const body: ExitDTO = req.body;

    const app = getOrCreateApp(workspaceName, appName);
    app.pid = null;
    app.error = body.error;
    app.status = AppStatus.Exited;
}

async function killApp(req) {
    logger.debug("killApp", req.params.app);

    const workspaceName = req.params.workspace;
    if(!workspaceName) {
        throw new Error("workspace is missing");
    }

    const appName = req.params.app;
    if(!appName) {
        throw new Error("app is missing");
    }

    const app = getOrCreateApp(workspaceName, appName);
    if(app.pid) {
        logger.debug("process.kill", app.pid);
        process.kill(app.pid);

        app.status = AppStatus.Killed;
        app.pid = null;
        app.error = null;
        app.message = null;
    }
}

// async function restartApps(req) {
//     logger.debug("restartApps", req.body);
//
//     const body: KillApps = req.body;
//     const names = body.names || apps.keys();
//
//     for(const name of names) {
//         killApp(name, "Killed by user");
//     }
//
//     for(const name of names) {
//         runApp(name, "Restart by user");
//     }
// }

// async function debugApp(req) {
//     logger.debug("debugApp", req.body);
//
//     const body: DebugApp = req.body;
//     if(!body.name) {
//         throw new Error("Invalid request. body.name is missing");
//     }
//
//     const app = getApp(body.name);
//
//     process["_debugProcess"](app.pid);
//
//     await delay(500);
//
//     logger.debug("Now you should open Chrome and navigate to chrome://inspect");
// }

// export function killAllApps(status: string) {
//     for(const [name, app] of apps) {
//         if(app.pid) {
//             killApp(name, status);
//         }
//     }
// }

// export function restartAll(message: string) {
//     for(const [name, app] of apps) {
//         if(app.status == AppStatus.Stopped) {
//             continue;
//         }
//
//         killApp(name, message);
//     }
//
//     for(const [name, app] of apps) {
//         if(app.status == AppStatus.Stopped) {
//             continue;
//         }
//
//         runApp(name, message);
//     }
// }

// function killApp(name: string, status: string) {
//     logger.debug("killApp", name);
//
//     try {
//         const app = findApp(name);
//         if (app && app.pid) {
//             process.kill(app.pid);
//
//             app.status = AppStatus.Killed;
//             app.pid = null;
//             app.message = status;
//         }
//     }
//     catch(err) {
//         logger.error("Failed to kill app " + name);
//     }
// }

// function findApp(work: WorkspaceRuntime, name: string) {
//     const app = work.apps.find(app => app.name.toLowerCase() == name.toLowerCase());
//     if(!app) {
//         return null;
//     }
//
//     return app;
// }

function findWorkspace(name: string): WorkspaceRuntime {
    const app = workspaces.get(name.toLowerCase());
    if(!app) {
        return null;
    }

    return app;
}

function findApp(workspace: WorkspaceRuntime, appName: string): AppRuntime {
    const app = workspace.apps.find(a => a.name.toLowerCase() == appName.toLowerCase());
    return app;
}

function getApp(work: WorkspaceRuntime, name: string) {
    const app = findApp(work, name);
    if(!app) {
        throw new Error("App with name " + name + " was not found");
    }

    return app;
}

function getWorkspace(name: string): WorkspaceRuntime {
    const app = findWorkspace(name);
    if(!app) {
        throw new Error("Workspace with name " + name + " was not found");
    }

    return app;
}

function getOrCreateWorkspace(name: string): WorkspaceRuntime {
    let work= findWorkspace(name);
    if(!work) {
        work = {
            name,
            config: null,
            apps: [],
        }

        workspaces.set(name, work);
    }

    return work;
}

function getOrCreateApp(workspaceName: string, appName: string): AppRuntime {
    const workspace = getOrCreateWorkspace(workspaceName);

    let app = findApp(workspace, appName);
    if(!app) {
        app = {
            name: appName,
            status: AppStatus.None,
            config: null,
            error: null,
            message: null,
            pid: null,
            port: null,
        };

        workspace.apps.push(app);
    }

    return app;
}

export function runApp(app: AppRuntime) {
    if(app.pid) {
        //
        //  Already running
        //
        return;
    }

    const proc = spawn("node", [app.config.main], {
        cwd: process.cwd(),
    });

    app.pid = proc.pid;
}

// function watchFS() {
//     const srcDir = path.resolve(__dirname, "..");
//     var watcher = chokidar.watch(srcDir, {
//         persistent: true
//     });
//
//     let timeoutId = null;
//     let hasJSChange = false;
//     watcher.on('change', filePath => {
//         if (path.extname(filePath) == ".js") {
//             hasJSChange = true;
//         }
//
//         clearTimeout(timeoutId);
//
//         timeoutId = setTimeout(function () {
//             if (hasJSChange) {
//                 logger.debug("File changed: " + filePath);
//
//                 restartAll("Restart by file changed");
//             }
//
//             timeoutId = null;
//             hasJSChange = false;
//         }, 200);
//     });
// }

main();

// interface ExitAppRequestDTO {
//     error: string;
// }
