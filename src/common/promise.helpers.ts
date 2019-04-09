import {promisify} from "util";
import EventEmitter = NodeJS.EventEmitter;

export type AsyncFunc1<TArg1, TRet> = (arg1: TArg1) => Promise<TRet>;
export type AsyncFunc2<TArg1, TArg2, TRet> = (arg1: TArg1, arg2: TArg2) => Promise<TRet>;
export type AsyncFunc3<TArg1, TArg2, TArg3, TRet> = (arg1: TArg1, arg2: TArg2, arg3: TArg3) => Promise<TRet>;

export type Task<T> = ()=>Promise<T>;

export function concurrentOld(tasks: Task<any>[], limit, terminate?: ()=>boolean) {
    return new Promise(function(resolve, reject) {
        let completed = 0;
        let running = 0;
        let index = 0;

        for (let i = 0; i < limit; i++) {
            more();
        }

        function more() {
            if(terminate && terminate()) {
                if(running == 0) {
                    resolve();
                }

                return;
            }

            if(completed == tasks.length) {
                resolve();
            }

            if (running >= limit) {
                return;
            }

            ++running;

            const task = tasks[index++];
            if(!task) {
                return;
            }

            task().then(function () {
                ++completed;
                --running;
                more();
            }).catch(function () {
                ++completed;
                --running;
                more();
            });
        }
    });
}

export function concurrent(itr: Iterator<Task<any>>, limit, terminate?: ()=>boolean): Promise<any> {
    return new Promise(function(resolve, reject) {
        let completed = 0;
        let running = 0;
        let index = 0;

        for (let i = 0; i < limit; i++) {
            more();
        }

        function more() {
            if(terminate && terminate()) {
                if(running == 0) {
                    resolve();
                }

                return;
            }

            const res = itr.next();
            if(res.done) {
                resolve();
                return;
            }

            if (running >= limit) {
                return;
            }

            ++running;

            const task = res.value;
            if(!task) {
                return;
            }

            task().then(function () {
                ++completed;
                --running;
                more();
            }).catch(function () {
                ++completed;
                --running;
                more();
            });
        }
    });
}

export function concurrentFromArray<T>(rows: T[], taskFactory: (row: T) => Task<any>, limit, terminate?: ()=>boolean): Promise<void> {
    return new Promise(function(resolve, reject) {
        let completed = 0;
        let running = 0;
        let index = 0;

        for (let i = 0; i < limit; i++) {
            more();
        }

        function more() {
            if(terminate && terminate()) {
                if(running == 0) {
                    resolve();
                }

                return;
            }

            if(index == rows.length) {
                if(running == 0) {
                    resolve();
                }

                return;
            }

            ++running;

            const task: Task<T> = taskFactory(rows[index++]);
            if(!task) {
                return;
            }

            task().then(function () {
                ++completed;
                --running;
                more();
            }).catch(function () {
                ++completed;
                --running;
                more();
            });
        }
    });
}

export function concurrentFromIterator<T>(itr: Iterator<T>, taskFactory: (row: T) => Task<any>, limit, terminate?: ()=>boolean): Promise<void> {
    return new Promise(function(resolve, reject) {
        let completed = 0;
        let running = 0;
        let index = 0;

        for (let i = 0; i < limit; i++) {
            more();
        }

        function more() {
            if(terminate && terminate()) {
                if(running == 0) {
                    resolve();
                }

                return;
            }

            if (running >= limit) {
                return;
            }

            const entry = itr.next();
            if(entry.done) {
                resolve();
                return;
            }

            const row = entry.value;

            const task: Task<T> = taskFactory(row);
            if(!task) {
                return;
            }

            ++running;

            task().then(function () {
                ++completed;
                --running;
                more();
            }).catch(function () {
                ++completed;
                --running;
                more();
            });
        }
    });
}

export interface Deferred<T> {
    promise: Promise<T>;
    resolve: (val: T)=>void;
    reject: (err: Error)=>void;
}

export function defer<T>(): Deferred<T> {
    let resolve,reject;

    const promise = new Promise<T>((res, rej)=> {
        resolve = res;
        reject = rej;
    });

    const res: Deferred<T> = {
        promise,
        resolve,
        reject
    };
    return res;
}

export function globalify(func): any {
    func = promisify(func);

    return function select(client) {
        return func.apply(client, Array.prototype.slice.call(arguments, 1));
    }
}

export function promisifyAll(that, methods: string[]) {
    const res: any = {};

    for(const method of methods) {
        res[method] = promisify(that[method].bind(that));
    }

    return res;
}

export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function waitForEvent(source: EventEmitter, eventName: string, rejectOnErrorEvent: boolean = false): Promise<void> {
    return new Promise((resolve,reject)=> {
        source.once(eventName, function() {
            resolve();
        });

        if(reject) {
            source.once("error", function(err) {
                reject(err);
            });
        }
    });
}
