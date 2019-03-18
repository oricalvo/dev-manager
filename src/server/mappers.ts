import {AppRuntime, AppDTO, AppConfigDTO, AppConfig} from "../common/dtos";
import moment = require("moment");
import {createLogger} from "../common/logger";

const logger = createLogger("mappers");

export function Mapper_AppRuntime_AppDTO(app: AppRuntime): AppDTO {
    return {
        name: app.name,
        status: app.status,
        pid: app.pid,
        error: app.error,
        port: app.port,
        ping: app.ping && moment(app.ping).format("HH:mm:ss"),
        config: Mapper_AppConfig_AppConfigDTO(app.config),
    }
}

export function Mapper_AppConfig_AppConfigDTO(app: AppConfig): AppConfigDTO {
    return {
        name: app.name,
        main: app.main,
        args: app.args,
        cwd: app.cwd,
        log: app.log,
    }
}
