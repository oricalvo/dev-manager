import {defer, Deferred} from "../common/promise.helpers";
import * as fs from "fs";
import * as split from "split2";
import {using} from "../common/object.helpers";
import {Readable} from "stream";

export class LineReader {
    deferred: Deferred<string>;
    stream;
    readable;
    err;
    end: boolean;

    constructor(public readStream: Readable, public closeOnDispose: boolean) {
        //
        //  The final (piped) stream has no close method
        //  so we need to hold both
        //
        this.stream = this.readStream
            .on("error", this.onError)
            .pipe(split())
            .on("error", this.onError)
            .on("end", this.onEnd);

        this.stream.on("readable", this.onReadable);
    }

    dispose(){
        if(this.readStream){
            if(this.closeOnDispose) {
                this.readStream["close"]();
            }

            this.readStream = null;
            this.stream = null;
        }
    }

    next(): Promise<string> {
        if (this.deferred) {
            //
            //  This is a second next call with the first being resolved yet
            //  We must return the same promise so both invocation resolve with the same line
            //
            return this.deferred.promise;
        }

        this.deferred = defer();

        if(!this.readable) {
            //
            //  readable event has not triggered yet but our caller wants some data already
            //  Need to wait for the readable event and only then new data can be read
            //
            return this.deferred.promise;
        }

        return this.internalNext();
    }

    private internalNext(): Promise<string> {
        const line = this.read();
        if(!line) {
            //
            //  We are at readable state but no data returned from the stream
            //  Move out of readable state and wait for it to happen again
            //
            this.readable = false;

            if(this.end) {
                this.deferred.resolve(null);
            }

            return this.deferred.promise;
        }

        const promise = this.deferred.promise;
        this.deferred.resolve(line);
        this.deferred = null;
        return promise;
    }

    private onError = (err) => {
        this.err = err;

        if(!this.deferred) {
            this.deferred = defer();
        }

        this.deferred.reject(err);
    }

    //
    //  A wrapper around stream.read that does not return empty lines
    //
    private read() {
        const buf = this.stream.read();
        if(!buf) {
            return null;
        }

        let line = buf.toString().trim();
        if(!line) {
            line = this.read();
        }

        return line;
    }

    private onReadable = () => {
        this.readable = true;

        if(this.deferred) {
            this.internalNext();
        }
    }

    private onEnd = () => {
        this.end = true;

        if(this.deferred) {
            this.internalNext();
        }
    }

    static fromFile(filePath: string): LineReader {
        const stream = fs.createReadStream(filePath, {encoding: "utf8"});
        return new LineReader(stream, true);
    }

    static fromStream(stream: Readable): LineReader {
        return new LineReader(stream, false);
    }

    static async getAllLines(filePath: string): Promise<string[]> {
        return await using(LineReader.fromFile(filePath), async reader => {
            const set = [];

            while(true) {
                const line = await reader.next();
                if(!line) {
                    break;
                }

                set.push(line);
            }

            return set;
        });
    }

    static async readObjects<T>(filePath: string): Promise<T[]> {
        return await using(LineReader.fromFile(filePath), async reader => {
            const objects = [];

            while(true) {
                const line = await reader.next();
                if(!line) {
                    break;
                }

                const obj = JSON.parse(line);
                objects.push(obj);
            }

            return objects;
        });
    }
}

