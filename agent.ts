import {createLogger} from "./logger";
import {WorkspaceConfig} from "./dtos";
import {loadConfig} from "./config";
import {BuildProxy} from "./proxy";

const logger = createLogger("BuildAgent");

export class BuildAgent {
    name: string;
    port: number;
    config: WorkspaceConfig;

    async init(name: string, port?: number) {
        this.name = name;
        this.port = port;
        this.config = await loadConfig();

        try {
            const proxy = new BuildProxy(this.config);
            await proxy.initApp(name, port);

            setTimeout(async ()=> {
                await this.ping();
            }, 1000);
        }
        catch(err) {
            logger.error(err);
        }
    }

    // async exit(error?: Error) {
    //     try {
    //         const proxy = new BuildProxy(this.config);
    //         await proxy.exitApp(this.name, error);
    //     }
    //     catch(err) {
    //         logger.error(err);
    //     }
    // }

    async ping() {
        const proxy = new BuildProxy(this.config);
        await proxy.pingApp(this.name, {
            pid: process.pid,
            port: this.port,
        });
    }
}
