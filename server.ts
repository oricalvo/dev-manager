import * as express from "express";
import {createLogger, createWinstonLogger, LOGGER} from "./logger";
import {promisifyExpressApi} from "./express.helpers";
import * as bodyParser from "body-parser";
import {BuildApp, BuildAppStatus, DebugApp, KillApps} from "./dtos";
import * as chokidar from "chokidar";
import * as path from "path";
import {delay} from "./promise.helpers";
import {registerService} from "oc-tools/serviceLocator";

const logger = createLogger();

const apps = new Map<string, BuildApp>();

export function main() {
    registerService(LOGGER, createWinstonLogger("dm.log", true, "dm"));

    const app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.text());

    app.get("/api/app", promisifyExpressApi(getApps));
    app.post("/api/app/:name/init", promisifyExpressApi(initApp));
    app.post("/api/app/:name/ping", promisifyExpressApi(pingApp));
    app.post("/api/app/:name/exit", promisifyExpressApi(exitApp));
    app.post("/api/app/kill", promisifyExpressApi(killApps));
    app.post("/api/app/restart", promisifyExpressApi(restartApps));
    app.post("/api/app/debug", promisifyExpressApi(debugApp));

    watchFS();

    app.listen(7070, function () {
        logger.debug("Server is running");
    });
}

async function getApps(): Promise<BuildApp[]> {
    logger.debug("getApps");

    return Array.from(apps.values());
}

async function initApp(req) {
    logger.debug("initApp", req.body);

    const name = req.params.name;
    if(!name) {
        throw new Error("name is missing");
    }

    const app = getApp(name);

    const body: BuildApp = req.body;
    if(!body.pid) {
        throw new Error("pid is missing");
    }

    app.status = BuildAppStatus.Running;
    app.port = body.port;
    app.pid = body.pid;

    app.message = "Init ack received";
}

async function pingApp(req) {
    logger.debug("pingApp", req.body);

    const name = req.params.name;
    if(!name) {
        throw new Error("name is missing");
    }

    const body: BuildApp = req.body;

    if(!body.pid) {
        throw new Error("pid is missing");
    }

    const app = getApp(body.name);
    app.status = BuildAppStatus.Running;
    app.port = body.port;
    app.pid = body.pid;
    app.error = null;

    app.message = "Ping ack received";
}

async function exitApp(req) {
    logger.debug("exitApp", req.params.name, req.body);

    const name = req.params.name;
    if(!name) {
        throw new Error("name parameter is missing");
    }

    const body: ExitAppRequestDTO = req.body;

    const app = getApp(name);
    app.pid = null;
    app.error = body.error;
    app.status = BuildAppStatus.Exited;

    if(app.error) {
        app.message = "Error reported by app";
    }
    else {
        app.message = "Exit reported by app";
    }
}

async function killApps(req) {
    logger.debug("killApps", req.body);

    const body: KillApps = req.body;
    const names = body.names || apps.keys();

    for(const name of names) {
        killApp(name, "Killed by user");
    }
}

async function restartApps(req) {
    logger.debug("restartApps", req.body);

    const body: KillApps = req.body;
    const names = body.names || apps.keys();

    for(const name of names) {
        killApp(name, "Killed by user");
    }

    for(const name of names) {
        runApp(name, "Restart by user");
    }
}

async function debugApp(req) {
    logger.debug("debugApp", req.body);

    const body: DebugApp = req.body;
    if(!body.name) {
        throw new Error("Invalid request. body.name is missing");
    }

    const app = getApp(body.name);

    process["_debugProcess"](app.pid);

    await delay(500);

    logger.debug("Now you should open Chrome and navigate to chrome://inspect");
}

export function killAllApps(status: string) {
    for(const [name, app] of apps) {
        if(app.pid) {
            killApp(name, status);
        }
    }
}

export function restartAll(message: string) {
    for(const [name, app] of apps) {
        if(app.status == BuildAppStatus.Stopped) {
            continue;
        }

        killApp(name, message);
    }

    for(const [name, app] of apps) {
        if(app.status == BuildAppStatus.Stopped) {
            continue;
        }

        runApp(name, message);
    }
}

function killApp(name: string, status: string) {
    logger.debug("killApp", name);

    try {
        const app = findApp(name);
        if (app && app.pid) {
            process.kill(app.pid);

            app.status = BuildAppStatus.Killed;
            app.pid = null;
            app.message = status;
        }
    }
    catch(err) {
        logger.error("Failed to kill app " + name);
    }
}

function findApp(name: string) {
    const app = apps.get(name.toLowerCase());
    if(!app) {
        return null;
    }

    return app;
}

function getApp(name: string) {
    const app = findApp(name);
    if(!app) {
        throw new Error("App with name " + name + " was not found");
    }

    return app;
}

export function runApp(name: string, message: string) {
}

function watchFS() {
    const srcDir = path.resolve(__dirname, "..");
    var watcher = chokidar.watch(srcDir, {
        persistent: true
    });

    let timeoutId = null;
    let hasJSChange = false;
    watcher.on('change', filePath => {
        if (path.extname(filePath) == ".js") {
            hasJSChange = true;
        }

        clearTimeout(timeoutId);

        timeoutId = setTimeout(function () {
            if (hasJSChange) {
                logger.debug("File changed: " + filePath);

                restartAll("Restart by file changed");
            }

            timeoutId = null;
            hasJSChange = false;
        }, 200);
    });
}

main();

interface ExitAppRequestDTO {
    error: string;
}
