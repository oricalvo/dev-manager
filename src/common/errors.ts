import {ErrorDTO} from "./dtos";

export class DMError extends Error {
    constructor(message: string, errorCode: ErrorCode = ErrorCode.InternalServerError) {
        super(message);
    }

    static fromDTO(err: ErrorDTO) {
        return new DMError(err.message, err.errorCode);
    }
}

export enum ErrorCode {
    InternalServerError = 1,
}
