import {httpRequest} from "./http.helpers";
import {createLogger} from "./logger";
import {AppRuntime, AppDTO, PingDTO, WorkspaceConfig, StartDTO, KillDTO} from "./dtos";

const logger = createLogger("BuildProxy");

export class BuildProxy {
    baseUrl: string = "http://localhost:7070/api";

    constructor(public config: WorkspaceConfig) {
    }

    async start(config: WorkspaceConfig) {
        logger.debug("start", config);

        const url = "/" + this.config.name + "/start";

        return await this.sendHttpRequest<void>("POST", url, config);
    }

    async list(): Promise<AppDTO[]> {
        logger.debug("list");

        return await this.sendHttpRequest<AppDTO[]>("GET", "/" + this.config.name + "/list");
    }

    async initApp(appName: string, port?: number): Promise<void> {
        logger.debug("initApp", appName, port);

        const url = "/" + this.config.name + "/" + appName + "/init";

        return await this.sendHttpRequest<void>("POST", url, {
            port,
        });
    }

    async exit(name: string, error?: Error) {
        logger.debug("exit", name, error);

        const url = "/" + this.config.name + "/app/" + name + "/exit";

        return await this.sendHttpRequest<void>("POST", url, {
            error: error && error.message,
        });

    }

    async ping(name: string, body: PingDTO) {
        logger.debug("ping", name, body);

        const url = "/" + this.config.name + "/" + name + "/ping";
        return await this.sendHttpRequest<void>("POST", url, body);

    }

    async kill(names: string[]) {
        logger.debug("kill", names);

        const url = "/" + this.config.name + "/kill";
        const body: KillDTO = {
            names,
        }
        return await this.sendHttpRequest<void>("POST", url, body);
    }

    async restart(appName: string) {
        logger.debug("restart", appName);

        const url = "/app/" + appName + "/restart";
        const body: StartDTO = {
            cwd: process.cwd(),
        };

        return await this.sendHttpRequest<void>("POST", url, body);
    }

    async debug(name: string) {
        logger.debug("debug", name);

        return await this.sendHttpRequest<void>("POST", "/app/debug", {
            name,
        });
    }

    private async sendHttpRequest<T>(method: string, url: string, data?: any): Promise<T> {
        logger.debug("sendHttpRequest", method, url, data);

        const res = await httpRequest<T>(method, this.baseUrl + url, data);
        return res;
    }
}
