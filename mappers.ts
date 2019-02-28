import {AppRuntime, AppDTO} from "./dtos";

export function Mapper_App_AppDTO(app: AppRuntime): AppDTO {
    return {
        name: app.name,
        status: app.status,
        pid: app.pid,
        message: app.message,
        error: app.error,
        port: app.port,
    }
}
