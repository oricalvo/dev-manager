import * as winston from "winston";
import * as moment from "moment";
import {resolveService, ServiceToken, tryResolveService} from "oc-tools/serviceLocator";
import * as util from "util";
import * as path from "path";
import {ExecutionContext} from "./executionContext";

const { printf } = winston.format;

const pid = process.pid;

export const LOGGER = new ServiceToken<LoggerService>("LOGGER");

export interface LogMethod {
    (level: string, message: string, meta: any);
}

export function consoleLogMethod(level: string, message: string, meta: any) {
    console.log(buildFormatMessage(level, meta.appName, meta.prefix, message));
}

export interface Logger {
    debug(...args);
    warn(...args);
    error(...args);
}

export function createLogger(name?: string): ModuleLogger {
    return new ModuleLogger(name);
}

export function createContextLogger(name: string) {
    const logger = new ContextLogger(name);
    return logger;
}

export function disableLogger(name: string) {
    return new DisableLogger({
        disabled: [name]
    });
}

export function disableLoggerBut(... names: string[]) {
    return new DisableLogger({
        enabled: names
    });
}

function buildFormatMessage(level, appName, prefix, message) {
    if(appName) {
        prefix = appName + ":" + pid + ":" + ExecutionContext.id() + (prefix ? " " + prefix : "");
    }
    else {
        if(prefix) {
            prefix = prefix + ":" + pid + ":" + ExecutionContext.id();
        }
        else {
            prefix = pid + ":" + ExecutionContext.id();
        }
    }

    return `${moment().format("HH:mm:ss:SSS")} ${getLevelString(level)} ${prefix} ${message}`;
}

export function createConsoleLogger(appName?: string) {
    const logger = new LoggerService(appName, consoleLogMethod);
    return logger;
}

export function createWinstonLogger(filePath: string = undefined, consoleTransport: boolean = true, appName?: string, appendPidToFileName?: boolean): LoggerService {
    if(!filePath) {
        const dirPath = process.cwd();
        const dirName = path.basename(dirPath);

        filePath = path.resolve(dirPath, dirName + ".log");
    }

    if(appendPidToFileName) {
        const info = path.parse(filePath);
        filePath = path.resolve(info.dir, info.name + "_" + process.pid + info.ext);
    }

    const format = printf(info => {
        return buildFormatMessage(info.level, appName, info.prefix, info.message);
    });

    const transports: any[] = [
        new winston.transports.File({
            filename: filePath,
            maxsize: 25 * 1024 * 1024,
            maxFiles: 5,
            tailable: true,
        })
    ];

    if(consoleTransport) {
        transports.push(new winston.transports.Console({}));
    }

    const logger = winston.createLogger({
        level: "debug",
        format: format,
        transports,
    });

    function logMethod(level: string, message: string, meta: any) {
        logger.log(level, message, meta);
    }

    return new LoggerService(appName, logMethod);
}

export function getLevelString(level: string) {
    return level.toUpperCase();
}

export class NullLogger implements Logger {
    debug(...args) {
    }

    warn(...args) {
    }

    error(...args) {
    }
}

//
//  A wrapper around LogMethod which adds enable/disable functionality
//
export class LoggerService {
    options: LoggerOptions;

    constructor(private appName: string, private logMethod: LogMethod) {
    }

    log(level: string, message: string, meta: any) {
        const prefix = meta.prefix;

        const disabled = this.options && this.options.disabled;
        if(disabled) {
            if(disabled.indexOf(prefix)!=-1) {
                return;
            }
        }

        const enabled = this.options && this.options.enabled;
        if(!disabled && enabled) {
            if(enabled.indexOf(prefix)==-1) {
                return;
            }
        }

        if(this.appName) {
            meta["appName"] = this.appName;
        }

        this.logMethod(level, message, meta);
    }

    enable(options: LoggerOptions) {
        this.options = options;
    }
}

export interface LoggerOptions {
    enabled?: string[];
    disabled?: string[];
}

export class ModuleLogger implements Logger {
    private logger: LoggerService;
    private disabled: boolean = false;

    constructor(public name: string) {
    }

    private ensureInit() {
        if(!this.logger) {
            this.reattachToLoggerService();
        }
    }

    disable() {
        this.disabled = true;
    }

    private log(level: string, args) {
        this.ensureInit();

        if(this.disabled) {
            return;
        }

        this.logger.log(level, util.format.apply(undefined, args), {
            prefix: this.name,
        });
    }

    debug(...args) {
        this.log("debug", args);
    }

    warn(...args) {
        this.log("warn", args);
    }

    error(...args) {
        this.log("error", args);
    }

    reattachToLoggerService() {
        this.logger = tryResolveService(LOGGER);
        if(!this.logger) {
            this.disabled = true;
            this.logger = <any>new NullLogger();
        }
    }
}

export class ContextLogger extends ModuleLogger {
    constructor(name: string) {
        super(name);

        ExecutionContext.get().set("LOGGER", this);
    }

    dispose() {
        ExecutionContext.current().removeIf("LOGGER", this);
    }
}

export class DisableLogger {
    logger: LoggerService;

    constructor(public options: LoggerOptions) {
        this.logger = resolveService(LOGGER);
        if(this.logger) {
            this.logger.enable(options);
        }
    }

    dispose() {
        if(this.logger) {
            this.logger.enable(null);
        }
    }
}
