import * as express from "express";
import {createLogger, createWinstonLogger, LOGGER} from "./logger";
import {promisifyExpressApi} from "./express.helpers";
import * as bodyParser from "body-parser";
import {AppRuntime, AppDTO, AppStatus, WorkspaceRuntime, WorkspaceConfig} from "./dtos";
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
    // app.post("/api/:worksapce/app/:name/init", promisifyExpressApi(initApp));
    // app.post("/api/app/:name/ping", promisifyExpressApi(pingApp));
    // app.post("/api/app/:name/exit", promisifyExpressApi(exitApp));
    // app.post("/api/app/kill", promisifyExpressApi(killApps));
    // app.post("/api/app/restart", promisifyExpressApi(restartApps));
    // app.post("/api/app/debug", promisifyExpressApi(debugApp));

    // watchFS();

    app.listen(7070, function () {
        logger.debug("Server is running");
    });
}

async function startWorkspace(req): Promise<AppDTO[]> {
    logger.debug("getApps");

    const name = req.params.workspace;
    if(!name) {
        throw new Error("workspace parameter is missing");
    }

    const config: WorkspaceConfig = req.body;

    const work = getOrCreateWorkspace(name, config);

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

    const work = getWorkspace(name);

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

// async function pingApp(req) {
//     logger.debug("pingApp", req.body);
//
//     const name = req.params.name;
//     if(!name) {
//         throw new Error("name is missing");
//     }
//
//     const body: App = req.body;
//
//     if(!body.pid) {
//         throw new Error("pid is missing");
//     }
//
//     const app = getApp(body.name);
//     app.status = AppStatus.Running;
//     app.port = body.port;
//     app.pid = body.pid;
//     app.error = null;
//
//     app.message = "Ping ack received";
// }

// async function exitApp(req) {
//     logger.debug("exitApp", req.params.name, req.body);
//
//     const name = req.params.name;
//     if(!name) {
//         throw new Error("name parameter is missing");
//     }
//
//     const body: ExitAppRequestDTO = req.body;
//
//     const app = getApp(name);
//     app.pid = null;
//     app.error = body.error;
//     app.status = AppStatus.Exited;
//
//     if(app.error) {
//         app.message = "Error reported by app";
//     }
//     else {
//         app.message = "Exit reported by app";
//     }
// }

// async function killApps(req) {
//     logger.debug("killApps", req.body);
//
//     const body: KillApps = req.body;
//     const names = body.names || apps.keys();
//
//     for(const name of names) {
//         killApp(name, "Killed by user");
//     }
// }

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

function findApp(work: WorkspaceRuntime, name: string) {
    const app = work.apps.find(app => app.name.toLowerCase() == name.toLowerCase());
    if(!app) {
        return null;
    }

    return app;
}

function findWorkspace(name: string): WorkspaceRuntime {
    const app = workspaces.get(name.toLowerCase());
    if(!app) {
        return null;
    }

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

function getOrCreateWorkspace(name: string, config: WorkspaceConfig): WorkspaceRuntime {
    let work= findWorkspace(name);
    if(!work) {
        const work: WorkspaceRuntime = {
            name,
            config,
            apps: [],
        }

        for(const appConfig of config.apps) {
            const app: AppRuntime = {
                config: appConfig,
                name: appConfig.name,
                error: null,
                message: null,
                pid: null,
                port: null,
                status: AppStatus.None,
            }
        }

        workspaces.set(name, work);
    }

    return work;
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
