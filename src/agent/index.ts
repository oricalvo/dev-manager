import {createLogger} from "../common/logger";
import {WorkspaceConfig} from "../common/dtos";
import {BuildProxy} from "../common/proxy";
import {loadConfigFrom} from "../common/config";

const logger = createLogger("BuildAgent");

export class BuildAgent {
    port: number;
    config: WorkspaceConfig;
    timeoutId;

    constructor(public name: string) {
    }

    async init() {
        logger.debug("init");

        this.config = await loadConfigFrom(process.cwd());

        try {
            const proxy = new BuildProxy(this.config);
            await this.ping();

            const schedule = () => {
                this.timeoutId = setTimeout(async ()=> {
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

    dispose() {
        clearTimeout(this.timeoutId);
        this.timeoutId = 0;
    }

    async ping() {
        logger.debug("ping", this.name);

        try {
            const proxy = new BuildProxy(this.config);
            await proxy.ping(this.name, {
                cwd: process.cwd(),
                pid: process.pid,
            });
        }
        catch(err) {
            logger.error(err);
        }
    }
}
