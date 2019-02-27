import {httpRequest} from "./http.helpers";
import {createLogger} from "./logger";
import {BuildApp} from "./dtos";

const logger = createLogger("BuildProxy");

export class BuildProxy {
    baseUrl: string = "http://localhost:7070/api";

    constructor() {
    }

    async getApps(workspaceName: string): Promise<BuildApp[]> {
        logger.debug("getApps", workspaceName);

        return await this.sendHttpRequest<BuildApp[]>("GET", "/" + workspaceName + "/app");
    }

    async initApp(app: BuildApp): Promise<void> {
        logger.debug("initApp2", app);

        const url = "/app/" + app.name + "/init";

        return await this.sendHttpRequest<void>("POST", url, app);
    }

    async exitApp(name: string, error?: Error) {
        logger.debug("exitApp", name, error);

        const url = "/app/" + name + "/exit";

        return await this.sendHttpRequest<void>("POST", url, {
            error: error && error.message,
        });

    }

    async pingApp(name: string, app: BuildApp) {
        logger.debug("pingApp", name, app);

        const url = "/app/" + name + "/ping";

        return await this.sendHttpRequest<void>("POST", url, app);

    }

    async kill(names: string[]) {
        logger.debug("kill", names);

        return await this.sendHttpRequest<void>("POST", "/app/kill", {
            names,
        });
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
        const res = await httpRequest<T>(method, this.baseUrl + url, data);
        return res;
    }
}

export const buildProxy = new BuildProxy();
