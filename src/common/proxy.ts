import {httpRequest} from "./http.helpers";
import {createLogger} from "./logger";
import {AppRuntime, AppDTO, PingDTO, WorkspaceConfig, StartDTO, StopDTO, ListDTO, ExitDTO} from "./dtos";

const logger = createLogger("BuildProxy");

const BASE_URL = "http://localhost:7070/api";

export class BuildProxy {

    constructor(public config: WorkspaceConfig) {
    }

    async start(names: string[]) {
        logger.debug("start");

        const url = "/start";

        const body: StartDTO = {
            cwd: process.cwd(),
            names,
        };

        return await sendHttpRequest<void>("POST", url, body);
    }

    async list(workspaceName: string): Promise<AppDTO[]> {
        logger.debug("list", workspaceName);

        const body: ListDTO = {
            cwd: process.cwd(),
        }

        return await sendHttpRequest<AppDTO[]>("GET", "/list", body);
    }

    async initApp(appName: string, port?: number): Promise<void> {
        logger.debug("initApp", appName, port);

        const url = "/" + this.config.name + "/" + appName + "/init";

        return await sendHttpRequest<void>("POST", url, {
            port,
        });
    }

    async exit(name: string, error?: Error) {
        logger.debug("exit", name, error);

        const url = "/" + this.config.name + "/app/" + name + "/exit";
        const body: ExitDTO = {
            cwd: process.cwd(),
            error: error && error.message,
        }

        return await sendHttpRequest<void>("POST", url, body);
    }

    async ping(name: string, body: PingDTO) {
        logger.debug("ping", name, body);

        const url = "/" + this.config.name + "/" + name + "/ping";
        return await sendHttpRequest<void>("POST", url, body);

    }

    async stop(names: string[]) {
        logger.debug("stop", names);

        const url = "/stop";
        const body: StopDTO = {
            cwd: process.cwd(),
            names,
        }
        return await sendHttpRequest<void>("POST", url, body);
    }

    async restart(names: string[]) {
        logger.debug("restart", names);

        const url = "/restart";

        const body: StartDTO = {
            cwd: process.cwd(),
            names,
        };

        return await sendHttpRequest<void>("POST", url, body);
    }

    async debug(name: string) {
        logger.debug("debug", name);

        return await sendHttpRequest<void>("POST", "/app/debug", {
            name,
        });
    }

    static async alive() {
        return await sendHttpRequest<void>("GET", "/alive", undefined, true);
    }

    static async shutdown() {
        await sendHttpRequest<void>("POST", "/shutdown");
    }
}

async function sendHttpRequest<T>(method: string, url: string, data?: any, dontParseBody?: boolean): Promise<T> {
    logger.debug("sendHttpRequest", method, url, data, dontParseBody);

    const res = await httpRequest<T>(method, BASE_URL + url, data, undefined, dontParseBody);
    return res;
}
