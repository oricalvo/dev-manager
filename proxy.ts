import {httpRequest} from "./http.helpers";
import {createLogger} from "./logger";
import {AppRuntime, AppDTO, PingDTO, WorkspaceConfig} from "./dtos";

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

    async getApps(): Promise<AppDTO[]> {
        logger.debug("getApps");

        return await this.sendHttpRequest<AppDTO[]>("GET", "/" + this.config.name + "/app");
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

    async kill(appName: string) {
        logger.debug("kill", appName);

        const url = "/" + this.config.name + "/" + appName + "/kill";
        return await this.sendHttpRequest<void>("POST", url, {});
    }

    async restart(names: string[]) {
        logger.debug("restart", names);

        return await this.sendHttpRequest<void>("POST", "/app/restart", {
            names,
        });
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
