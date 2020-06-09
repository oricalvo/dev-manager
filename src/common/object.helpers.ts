export interface Using {
    <T, R>(factory: T|Promise<T>, task: (obj: T)=>R|Promise<R>): Promise<R>;
    <T1, T2, R>(factory1: T1|Promise<T1>, factory2: T2|Promise<T2>, task: (obj1: T1, obj2: T2)=>R|Promise<R>): Promise<R>;
    <T1, T2, T3, R>(factory1: T1|Promise<T1>, factory2: T2|Promise<T2>, factory3: T3|Promise<T3>, task: (obj1: T1, obj2: T2, obj3: T3)=>R|Promise<R>): Promise<R>;
    <T1, T2, T3, T4, R>(factory1: T1|Promise<T1>, factory2: T2|Promise<T2>, factory3: T3|Promise<T3>, factory4: T4|Promise<T4>, task: (obj1: T1, obj2: T2, obj3: T3, obj4: T4)=>R|Promise<R>): Promise<R>;
}

export const using: Using = async function<T1, T2, R>(... items) {
    //
    //  items can contains the resource itself or a promise that resolve with the resource
    //

    let resources: any[] = [];

    try {
        //
        //  Last item is not a promise but rather that task to be executed
        //
        const task = items.pop();

        const promises = [];

        for(let i=0; i<items.length; i++) {
            const item = items[i];
            if(item && item.then) {
                promises.push(item.then(resource => {
                    resources[i] = resource;
                }));
            }
            else {
                resources[i] = item;
            }
        }

        if(promises.length) {
            await Promise.all(promises);
        }

        //
        //  At that point, resources is filled
        //

        const retVal = task ? await task(... resources) : undefined;
        return retVal;
    }
    finally {
        for(const resource of resources) {
            disposeObject(resource);
        }
    }
}

export function disposeObject(obj) {
    if(!obj) {
        return;
    }

    if(obj.dispose) {
        obj.dispose();
    }
    else if(obj.close) {
        obj.close();
    }
}

