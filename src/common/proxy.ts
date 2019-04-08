import {createLogger} from "./logger";
import {AppRuntime, AppDTO, PingDTO, WorkspaceConfig, StartDTO, StopDTO, ListDTO, ExitDTO, GetAppDTO} from "./dtos";
import {httpRequest, HttpRequestOptions} from "oc-tools/http";

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

        return await sendHttpRequest<void>({
            method: "POST",
            url,
            data: body
        });
    }

    async list(): Promise<AppDTO[]> {
        logger.debug("list");

        const body: ListDTO = {
            cwd: process.cwd(),
        }

        return await sendHttpRequest<AppDTO[]>({
            method: "GET",
            url: "/list",
            data: body
        });
    }

    async app(appName: string): Promise<AppDTO> {
        logger.debug("app", appName);

        const data: GetAppDTO = {
            cwd: process.cwd(),
        }

        return await sendHttpRequest<AppDTO>({
            method: "GET",
            url: "/app/" + appName,
            data,
        });
    }

    async initApp(appName: string, port?: number): Promise<void> {
        logger.debug("initApp", appName, port);

        const url = "/" + this.config.name + "/" + appName + "/init";

        return await sendHttpRequest<void>({
            method: "POST",
            url,
            data: {
                port,
            }
        });
    }

    async exit(name: string, error?: Error) {
        logger.debug("exit", name, error);

        const url = "/" + this.config.name + "/app/" + name + "/exit";
        const body: ExitDTO = {
            cwd: process.cwd(),
            error: error && error.message,
        }

        return await sendHttpRequest<void>({
            method: "POST",
            url,
            data: body
        });
    }

    async ping(name: string, body: PingDTO) {
        logger.debug("ping", name, body);

        const url = "/" + this.config.name + "/" + name + "/ping";
        return await sendHttpRequest<void>({
            method: "POST",
            url,
            data: body
        });
    }

    async stop(names: string[]) {
        logger.debug("stop", names);

        const url = "/stop";
        const body: StopDTO = {
            cwd: process.cwd(),
            names,
        }
        return await sendHttpRequest<void>({
            method: "POST",
            url,
            data: body
        });
    }

    async restart(names: string[]) {
        logger.debug("restart", names);

        const url = "/restart";

        const body: StartDTO = {
            cwd: process.cwd(),
            names,
        };

        return await sendHttpRequest<void>({
            method: "POST",
            url,
            data: body
        });
    }

    async debug(name: string) {
        logger.debug("debug", name);

        return await sendHttpRequest<void>({
            method: "POST",
            url: "/app/debug",
            data: {
                name,
            }
        });
    }

    static async alive() {
        return await sendHttpRequest<void>({
            method: "GET",
            url: "/alive",
            dontParseBody: true
        });
    }

    static async shutdown() {
        await sendHttpRequest<void>({
            method: "POST",
            url: "/shutdown"
        });
    }
}

async function sendHttpRequest<T>(options: HttpRequestOptions): Promise<T> {
    logger.debug("sendHttpRequest", options);

    return await httpRequest({
        ...options,
        url: BASE_URL + options.url,
    });
}
