import * as express from "express";
import {createLogger, createWinstonLogger, LOGGER} from "../common/logger";
import {promisifyExpressApi, registerErrorHandler} from "./express.helpers";
import * as bodyParser from "body-parser";
import {
    AppConfig,
    AppDTO,
    AppRuntime,
    AppStatus,
    EnableDTO,
    GetAppDTO,
    ListDTO,
    PingDTO,
    StartDTO,
    StopDTO,
    WorkspaceRuntime
} from "../common/dtos";
import {registerService} from "oc-tools/serviceLocator";
import {spawn} from "child_process";
import {Mapper_AppRuntime_AppDTO} from "./mappers";
import {loadConfigFrom} from "../common/config";
import * as colors from "colors";
import {delay} from "../common/promise.helpers";
import {getAppConfig, resolveAppNames} from "../common/common";
import * as http from "http";
import {parseQueryParams} from "oc-tools/http";
import {DMError} from "../common/errors";

const logger = createLogger();

const workspaces = new Map<string, WorkspaceRuntime>();

export function main() {
    registerService(LOGGER, createWinstonLogger("dm.log", true, "dm"));

    try {
        const app = express();
        const server = http.createServer(app);

        app.use(bodyParser.json());
        app.use(bodyParser.text());

        app.get("/api/alive", promisifyExpressApi(alive));
        app.post("/api/shutdown", promisifyExpressApi(() => shutdown(app)));
        app.post("/api/start", promisifyExpressApi(start));
        app.post("/api/restart", promisifyExpressApi(restart));
        app.post("/api/stop", promisifyExpressApi(stop));
        app.post("/api/enable", promisifyExpressApi(enable));
        app.get("/api/list", promisifyExpressApi(list));
        app.get("/api/app/:name", promisifyExpressApi(getApp));
        app.post("/api/:workspace/:app/ping", promisifyExpressApi(ping));

        registerErrorHandler(app);

        startCheckAlive();

        server.on("error", function(err) {
            logger.error(err);
            logger.error("Server encountered error. Exiting ...");
            process.exit(1);
        });

        server.listen(7070, function () {
            logger.debug("Server is running on port 7070");
        });
    }
    catch(err) {
        logger.error(err);
    }
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
    const names = resolveAppNames(work.config, body.names);

    startApps(work, names);

    return work.apps.map(Mapper_AppRuntime_AppDTO);
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

    const body = parseQueryParams<ListDTO>(req.query);
    if(!body.cwd) {
        throw new Error("Missing cwd parameter");
    }

    const work = await loadWorkspace(body.cwd);

    return work.apps.map(Mapper_AppRuntime_AppDTO);
}

async function getApp(req): Promise<AppDTO> {
    logger.debug("getApp", req.body);

    const {name} = req.params;
    if(!name) {
        throw new Error("Missing name parameter");
    }

    const body = parseQueryParams<GetAppDTO>(req.query);
    if(!body.cwd) {
        throw new Error("Missing cwd parameter");
    }

    const work = await loadWorkspace(body.cwd);
    const app = findAppByName(work, name);

    return Mapper_AppRuntime_AppDTO(app);
}

async function restart(req) {
    logger.debug("restartApp", req.body);

    const body: StartDTO = req.body;
    if(!body.cwd) {
        throw new Error("Bad request, cwd is missing");
    }

    const work = await loadWorkspace(body.cwd);
    const names = resolveAppNames(work.config, body.names);

    stopApps(work, names);
    await delay(100);
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

    const now = new Date();
    const work = await loadWorkspace(body.cwd);
    const app = getOrCreateApp(work, appName);

    if(app.status == AppStatus.Disabled) {
        return;
    }

    if(app.status == AppStatus.Stopped && (now.valueOf() - app.stopped.valueOf()) < 1000) {
        //
        //  There is a race condition between user that is stopping an application and the ping mechanism
        //  Once app is stopped by the user we ignore all ping request for 1 seconds
        //
        logger.debug("Ignore ping because of Stopped state");
        return;
    }

    app.status = AppStatus.Running;
    app.error = null;
    app.pid = body.pid;
    app.ping = now;
}

async function stop(req) {
    logger.debug("stop", req.body);

    const body: StopDTO = req.body;

    const work = await loadWorkspace(body.cwd);
    const names = resolveAppNames(work.config, body.names);

    stopApps(work, names);
}

async function enable(req) {
    logger.debug("disable", req.body);

    const body: EnableDTO = req.body;

    const work = await loadWorkspace(body.cwd);
    const names = resolveAppNames(work.config, body.names);

    enableApps(work, names, body.enable);
}

function stopApps(work: WorkspaceRuntime, names: string[]) {
    logger.debug("stopApps", names);

    for(const appName of names) {
        const app = getOrCreateApp(work, appName);
        stopApp(app);
    }
}

function enableApps(work: WorkspaceRuntime, names: string[], enable: boolean) {
    for(const appName of names) {
        const app = getOrCreateApp(work, appName);
        enableApp(app, enable);
    }
}

async function stopApp(app: AppRuntime) {
    logger.debug("stopApp", app.name);

    if(app.status == AppStatus.Disabled) {
        return;
    }

    if (app.pid) {
        logger.debug("process.kill", app.pid);

        //
        //  Changing status before killing process
        //  So when the "close" event fires we can detect that the app was closed and not killed
        //
        const pid = app.pid;

        app.status = AppStatus.Stopped;
        app.pid = null;
        app.stopped = new Date();

        process.kill(pid);
    }
}

async function enableApp(app: AppRuntime, enable: boolean) {
    logger.debug("enableApp", app.name, enable);

    if(enable) {
        if(app.status == AppStatus.Disabled) {
            app.status = AppStatus.None;
            app.pid = null;

            startApp(app);
        }
    }
    else {
        stopApp(app);

        app.status = AppStatus.Disabled;
    }
}

function findWorkspace(name: string): WorkspaceRuntime {
    const app = workspaces.get(name.toLowerCase());
    if(!app) {
        return null;
    }

    return app;
}

function findAppByName(workspace: WorkspaceRuntime, appName: string): AppRuntime {
    const app = workspace.apps.find(a => a.name.toLowerCase() == appName.toLowerCase());
    return app;
}

function getAppByName(work: WorkspaceRuntime, name: string): AppRuntime {
    const app = findAppByName(work, name);
    if(!app) {
        throw new DMError("App with name " + name + " was not found");
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
    let work = findWorkspace(config.name || cwd);
    if(!work) {
        work = {
            name: config.name,
            config,
            apps: [],
        }

        for(const project of config.projects) {
            for (const appConfig of project.apps) {
                const app = createAppRuntime(work, appConfig);
                work.apps.push(app);
            }
        }

        workspaces.set(config.name, work);
    }

    return work;
}

function getOrCreateApp(workspace: WorkspaceRuntime, appName: string): AppRuntime {
    let app = findAppByName(workspace, appName);
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

    if(app.status == AppStatus.Disabled) {
        logger.debug("Do not start app because it is in Disabled status");
        return;
    }

    if(app.proc) {
        //
        //  Already running
        //
        return;
    }

    try {
        const now = new Date();

        const proc = spawn("node", [app.config.main, ...app.config.args], {
                cwd: app.config.cwd,
                detached: true,
                stdio: "ignore",
            });

        app.proc = proc;
        app.pid = proc.pid;
        app.status = AppStatus.Running;
        app.ping = now;

        proc.on("close", function () {
            if (app.status != AppStatus.Stopped && app.status != AppStatus.Disabled) {
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

function startCheckAlive() {
    setTimeout(function() {
        try {
            checkAlive();
        }
        finally {
            startCheckAlive();
        }
    }, 1000);
}

function checkAlive() {
    logger.debug("checkAlive");

    const now = new Date();

    for(const [workspaceName, work] of workspaces) {
        for(const app of work.apps) {
            if(app.status != AppStatus.Running) {
                continue;
            }

            if(now.valueOf() - app.ping.valueOf() > 5000) {
                app.status = AppStatus.Dead;
            }
        }
    }
}

main();

