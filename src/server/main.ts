import * as express from "express";
import {createLogger, createWinstonLogger, LOGGER} from "../common/logger";
import {promisifyExpressApi} from "./express.helpers";
import * as bodyParser from "body-parser";
import {
    AppConfig,
    AppDTO,
    AppRuntime,
    AppStatus,
    ListDTO,
    PingDTO,
    StartDTO,
    StopDTO,
    WorkspaceConfig,
    WorkspaceRuntime
} from "../common/dtos";
import {registerService} from "oc-tools/serviceLocator";
import {spawn} from "child_process";
import {Mapper_App_AppDTO} from "./mappers";
import {loadConfigFrom} from "../common/config";
import * as colors from "colors";
import {delay} from "../common/promise.helpers";
import * as path from "path";
import {getAppWorkingDirectory} from "../common/common";

const logger = createLogger();

const workspaces = new Map<string, WorkspaceRuntime>();

export function main() {
    registerService(LOGGER, createWinstonLogger("dm.log", true, "dm"));

    const app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.text());

    app.get("/api/alive", promisifyExpressApi(alive));
    app.post("/api/shutdown", promisifyExpressApi(() => shutdown(app)));
    app.post("/api/start", promisifyExpressApi(start));
    app.post("/api/restart", promisifyExpressApi(restart));
    app.post("/api/stop", promisifyExpressApi(stop));
    app.get("/api/list", promisifyExpressApi(list));

    app.post("/api/:workspace/:app/ping", promisifyExpressApi(ping));
    // app.post("/api/:workspace/:app/exit", promisifyExpressApi(exit));

    // app.post("/api/:workspace/restart", promisifyExpressApi(restartAllApp));
    // app.post("/api/:workspace/kill", promisifyExpressApi(killApp));
    // app.post("/api/app/:app/restart", promisifyExpressApi(restartApps));
    // app.post("/api/:worksapce/app/:name/init", promisifyExpressApi(initApp));
    // app.post("/api/app/restart", promisifyExpressApi(restartApps));
    // app.post("/api/app/debug", promisifyExpressApi(debugApp));

    // watchFS();

    app.listen(7070, function () {
        logger.debug("Server is running on port 7070");
    });
}

function alive(req) {
    return "ALIVE";
}

function shutdown(app) {
    setTimeout(function() {
        process.exit(0);
    }, 1000);
}

async function start(req): Promise<AppDTO[]> {
    logger.debug("start", req.body);

    const body: StartDTO = req.body;

    const work = await loadWorkspace(body.cwd);
    const names = body.names || work.config.apps.map(a=>a.name);

    startApps(work, names);

    return work.apps.map(Mapper_App_AppDTO);
}

function startApps(work: WorkspaceRuntime, names: string[]) {
    logger.debug("startApps", names);

    for(const appName of names) {
        const app = getOrCreateApp(work, appName);
        startApp(app);
    }
}

async function list(req): Promise<AppDTO[]> {
    logger.debug("list", req.body);

    const body: ListDTO = req.body;

    const work = await loadWorkspace(body.cwd);

    return work.apps.map(Mapper_App_AppDTO);
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

async function restart(req) {
    logger.debug("restartApp", req.body);

    const body: StartDTO = req.body;
    if(!body.cwd) {
        throw new Error("Bad request, cwd is missing");
    }

    const work = await loadWorkspace(body.cwd);
    const names = body.names || work.apps.map(a=>a.name);

    stopApps(work, names);
    await delay(1000);
    startApps(work, names);
}

async function ping(req) {
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

    const work = await loadWorkspace(body.cwd);
    const app = getOrCreateApp(work, appName);
    app.status = AppStatus.Running;
    app.error = null;
    app.pid = body.pid;
    app.ping = new Date();
}

// async function exit(req) {
//     logger.debug("exit", req.params.name, req.body);
//
//     const workspaceName = req.params.workspace;
//     if(!workspaceName) {
//         throw new Error("workspace is missing");
//     }
//
//     const appName = req.params.app;
//     if(!appName) {
//         throw new Error("app is missing");
//     }
//
//     const body: ExitDTO = req.body;
//
//     const work = await loadWorkspace(body.cwd);
//     const app = getOrCreateApp(work, appName);
//
//     if(app.proc) {
//         app.proc.unref();
//         app.proc = null;
//     }
//
//     app.error = body.error;
//     app.status = AppStatus.Exited;
// }

async function stop(req) {
    logger.debug("stop", req.body);

    const body: StopDTO = req.body;

    const work = await loadWorkspace(body.cwd);
    const names = body.names || work.config.apps.map(a=>a.name);

    stopApps(work, names);
}

function stopApps(work: WorkspaceRuntime, names: string[]) {
    for(const appName of names) {
        const app = getOrCreateApp(work, appName);
        stopApp(app);
    }
}

async function stopApp(app: AppRuntime) {
    logger.debug("stopApp", app.name);

    if (app.pid) {
        logger.debug("process.kill", app.pid);

        process.kill(app.pid);

        app.status = AppStatus.Stopped;
    }
}

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

function getAppConfig(workspace: WorkspaceConfig, appName: string): AppConfig {
    const app = workspace.apps.find(a => a.name.toLowerCase() == appName.toLowerCase());
    if(!app) {
        throw new Error("App config with name " + appName + " was not found");
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

const pickColor = (function() {
    const all = [
        colors.green,
        colors.blue,
        colors.red,
        colors.magenta
    ];

    return function () {
        const color = all.pop();
        return color;
    }
})();


async function loadWorkspace(cwd: string): Promise<WorkspaceRuntime> {
    const config = await loadConfigFrom(cwd);
    let work = findWorkspace(config.name);
    if(!work) {
        work = {
            name: config.name,
            config,
            apps: [],
        }

        for(const appConfig of config.apps) {
            const app = createAppRuntime(work, appConfig);
            work.apps.push(app);
        }

        workspaces.set(config.name, work);
    }

    return work;
}

// function getOrCreateWorkspace(workspaceName: string): WorkspaceRuntime {
//     let work = findWorkspace(workspaceName);
//     if(!work) {
//         work = {
//             name: workspaceName,
//             config: null,
//             apps: [],
//         }
//
//         workspaces.set(workspaceName, work);
//     }
//
//     return work;
// }

function getOrCreateApp(workspace: WorkspaceRuntime, appName: string): AppRuntime {
    let app = findApp(workspace, appName);
    if(!app) {
        const appConfig = getAppConfig(workspace.config, appName);
        app = createAppRuntime(workspace, appConfig);

        workspace.apps.push(app);
    }

    return app;
}

function createAppRuntime(workspace: WorkspaceRuntime, config: AppConfig) {
    const app: AppRuntime = {
        name: config.name,
        status: AppStatus.None,
        config,
        error: null,
        message: null,
        proc: null,
        pid: null,
        port: null,
        ping: null,
        color: pickColor(),
        workspace: workspace,
    };

    return app;
}

export function startApp(app: AppRuntime) {
    logger.debug("startApp", app.name);

    if(app.proc) {
        //
        //  Already running
        //
        return;
    }

    try {
        const cwd = getAppWorkingDirectory(app.workspace.config, app.config);

        console.log("xxx", cwd);

        const proc = spawn("node", [app.config.main, ...app.config.args], {
                cwd,
                detached: true,
                stdio: "ignore",
            });

        app.proc = proc;
        app.pid = proc.pid;
        app.status = AppStatus.Running;

        proc.on("close", function () {
            if (app.status != AppStatus.Stopped) {
                app.status = AppStatus.Killed;
            }

            if (app.proc) {
                app.proc.unref();
                app.proc = null;
                app.pid = null;
            }
        });

        proc.on("error", function (err) {
            app.error = err.message;
            app.status = AppStatus.Killed;
            app.proc = null;
            app.pid = null;
        });
    }
    catch(err) {
        app.error = err.message;
        app.status = AppStatus.Killed;
        app.proc = null;
    }
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
