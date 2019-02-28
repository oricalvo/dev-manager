import {createLogger} from "./logger";
import {WorkspaceConfig} from "./dtos";
import {loadConfig} from "./config";
import {BuildProxy} from "./proxy";

const logger = createLogger("BuildAgent");

export class BuildAgent {
    port: number;
    config: WorkspaceConfig;

    constructor(public name: string) {
    }

    async init() {
        logger.debug("init");

        this.config = await loadConfig();

        try {
            const proxy = new BuildProxy(this.config);
            await this.ping();

            const schedule = () => {
                setTimeout(async ()=> {
                    await this.ping();

                    schedule();
                }, 1000);
            }

            schedule();
        }
        catch(err) {
            logger.error(err);
        }
    }

    async exit(error?: Error) {
        try {
            const proxy = new BuildProxy(this.config);
            await proxy.exit(this.name, error);
        }
        catch(err) {
            logger.error(err);
        }
    }

    async ping() {
        logger.debug("ping", this.name);

        try {
            const proxy = new BuildProxy(this.config);
            await proxy.ping(this.name, {
                pid: process.pid,
                port: this.port,
            });
        }
        catch(err) {
            logger.error(err);
        }
    }
}
