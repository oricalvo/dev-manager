import * as request from "request";
import {HttpError} from "oc-tools/express";
import {createLogger} from "./logger";
import {IncomingMessage} from "http";
import {CoreOptions} from "request";

const logger = createLogger("http.helpers");

export async function requestHTTP<T, R>(url: string, options: CoreOptions): Promise<IncomingMessage> {
    return new Promise<IncomingMessage>((resolve, reject)=> {
        request(url, options, function(err, response: IncomingMessage, body) {
            if(err) {
                reject(err);
                return;
            }

            resolve(response);
        });
    });
}

export function httpRequest<T>(method: string, url: string, data?: any, headers?: any, dontParseBody?: boolean): Promise<T> {
    return new Promise((resolve, reject)=> {
        request(
            {
                method,
                url,
                json: data,
                headers,
            },
            function (error, response, body) {
                if(error) {
                    reject(error);
                    return;
                }

                if(!response) {
                    reject(new Error("No response object"));
                    return;
                }

                if (response.statusCode != 200) {
                    if(body) {
                        reject(new HttpError(body.message || body.error || "HTTP response error", response.statusCode, response.statusMessage, body));
                    }
                    else {
                        reject(new Error("Server returned status code " + response.statusCode + ", " + response.statusMessage));
                    }

                    return;
                }

                try {
                    if(!dontParseBody && !!body && typeof body == "string") {
                        resolve(JSON.parse(body));
                    }
                    else {
                        resolve(body);
                    }
                }
                catch(err) {
                    reject(err);
                }
            }
        );
    });
}

export function httpGet<T>(url: string): Promise<T> {
    return new Promise((resolve, reject)=> {
        request.get(
            url,
            function (error, response, body) {
                if(error) {
                    reject(error);
                    return;
                }

                if(!response) {
                    reject(new Error("No response object"));
                    return;
                }

                if (response.statusCode != 200) {
                    reject(new Error("statusCode " + response.statusCode + ", " + response.statusMessage));
                    return;
                }

                resolve(JSON.parse(body));
            }
        );
    });
}
