import {AppRuntime, AppDTO} from "../common/dtos";
import moment = require("moment");
import {createLogger} from "../common/logger";

const logger = createLogger("mappers");

export function Mapper_App_AppDTO(app: AppRuntime): AppDTO {
    return {
        name: app.name,
        status: app.status,
        pid: app.pid,
        error: app.error,
        port: app.port,
        ping: app.ping && moment(app.ping).format("HH:mm:ss")
    }
}
