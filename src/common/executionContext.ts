import * as domain from "domain";

export class ExecutionContext {
    id: number;
    data = new Map<string, any>();
    static originalDomainCreate;
    static nextId = 1;
    static duringCreate: boolean = false;

    constructor() {
        if(ExecutionContext.nextId == 100000000) {
            ExecutionContext.nextId = 1;
        }

        this.id = ExecutionContext.nextId++;
    }

    set(key: string, value: any) {
        this.data.set(key, value);
    }

    get(key: string) {
        return this.data.get(key);
    }

    removeIf(key: string, value: any) {
        if(this.data.get(key) == value) {
            this.data.delete(key);
        }
    }

    static install() {
        ExecutionContext.originalDomainCreate = domain.create;

        (<any>domain).create = function() {
            const currentDomain = process.domain;
            const newDomain = ExecutionContext.originalDomainCreate.apply(this, arguments);

            if (ExecutionContext.duringCreate) {
                //
                //  This domain is created as part of new ExecutionContext
                //  No need to do anything. ExecutionContext.run is responsible for attaching this domain to the newly created ExecutionContext
                //
            }
            else {
                if (currentDomain) {
                    //
                    //  This domain is created by 3rd party code
                    //  Associate this domain with existing ExecutionContext (if exist)
                    //
                    newDomain["executionContext"] = currentDomain["executionContext"];
                }
            }

            return newDomain;
        }
    }

    static uninstall() {
        (<any>domain).create = ExecutionContext.originalDomainCreate;
    }

    static current(): ExecutionContext {
        const current = process.domain;
        if(!current) {
            return null;
        }

        return current["executionContext"];
    }

    static get(): ExecutionContext {
        const current = ExecutionContext.current();
        if(!current) {
            throw new Error("No current ExecutionContext");
        }

        return current;
    }

    static id() {
        const context = ExecutionContext.current();
        if(!context) {
            return 0;
        }

        return context.id;
    }

    static run(func) {
        ExecutionContext.duringCreate = true;
        const newDomain = domain.create();
        ExecutionContext.duringCreate = false;

        const executionContext = new ExecutionContext();
        newDomain["executionContext"] = executionContext;

        let retVal;
        newDomain.run(function() {
            retVal = func(executionContext);
        });

        return retVal;
    }
}
