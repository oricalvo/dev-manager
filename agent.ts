import {createLogger} from "./logger";
import {buildProxy} from "./proxy";

const logger = createLogger("BuildAgent");

export class BuildAgent {
    name: string;
    port: number;

    async init(name: string, port?: number) {
        this.name = name;
        this.port = port;

        try {
            await buildProxy.initApp({
                name,
                pid: process.pid,
                port,
                message: null,
                error: null,
                status: null,
            })

            setTimeout(async ()=> {
                await this.ping();
            }, 1000);
        }
        catch(err) {
            logger.error(err);
        }
    }

    async exit(error?: Error) {
        try {
            await buildProxy.exitApp(this.name, error);
        }
        catch(err) {
            logger.error(err);
        }
    }

    async ping() {
        await buildProxy.pingApp(this.name, {
            name: this.name,
            pid: process.pid,
            port: this.port,
        });
    }
}
