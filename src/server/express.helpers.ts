import * as path from "path";
import {ExecutionContext} from "../common/executionContext";
import {createLogger} from "../common/logger";
import {DMError, ErrorCode} from "../common/errors";
import {ErrorDTO} from "../common/dtos";

const logger = createLogger("express.helpers");

export abstract class ResponseAction {
    abstract execute(req, res);
}

export class SendFile extends ResponseAction {
    constructor(public filePath: string, public fileName?: string) {
        super();

        if(!this.fileName) {
            this.fileName = path.basename(this.filePath);
        }
    }

    execute(req, res) {
        res.set("content-disposition", `attachment; filename="${this.fileName}"`);
        res.sendFile(this.filePath);
    }
}

export function promisifyExpressApi(func) {
    return async function (req, res, next) {
        const before = new Date();

        await ExecutionContext.run(async context => {
            try {
                const id1 = ExecutionContext.id();
                logger.debug(req.connection.remoteAddress, req.method, req.originalUrl.substring(0, 100), "BEGIN");

                const retVal = await func.call(this, req, res, next);

                if (retVal && retVal instanceof ResponseAction) {
                    await retVal.execute(req, res);
                } else {
                    res.send(retVal);
                }

                const after = new Date();
                logger.debug(req.connection.remoteAddress, req.method, req.originalUrl.substring(0, 100), "END", (after.valueOf() - before.valueOf()), "ms");
            } catch (err) {
                const id1 = ExecutionContext.id();
                const after = new Date();
                logger.debug(req.connection.remoteAddress, req.method, req.originalUrl.substring(0, 100), "ERROR", err.message, (after.valueOf() - before.valueOf()), "ms");

                next(err);
            }
        });
    }
}

export function registerErrorHandler(appOrRouter) {
    appOrRouter.use(function(err, req, res, next) {
        logger.error(err);

        const dto: ErrorDTO = {
            message: err.message || "Internal server error",
            errorCode: err.errorCode || ErrorCode.InternalServerError,
        }

        const statusCode = err.statusCode || 500;

        res.status(statusCode);
        res.status_message = dto.message;
        res.send(dto);
    });
}
