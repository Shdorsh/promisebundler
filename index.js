// The promisebundle, which mainly puts together the promises through a linker object and checks if everything was fetched
class PromiseBundle {
    #canFetch = false;
    #ready = false;
    #isStrict = false;
    #sendDataToFunction;
    #calledFunction;
    #functionArgs;
    #unfulfilledPromiseLinkers = {};
    #resolvedPromises = {};
    #rejectedPromises = {};

    // new PromiseBundle({promisekey1: Promise1, promisekey2: Promise2, promisekey3: Promise3...}, callBackFunction, ?[functionArg1, functionArg2, ...] ?doesItSendItsResultsToFunction)
    constructor(promises = {}, callBackFunction = undefined, functionArgs = [], sendDataToFunction = true) {
        this.addPromises(promises);
        this.#calledFunction = callBackFunction;
        this.#sendDataToFunction = sendDataToFunction;
        this.#functionArgs = functionArgs;
    }

    // add or delete as many promises as you want with a linker and adding it with a key to the object or deleting the key
    addPromises(newPromises) {
        for(const key in newPromises) {
            this.#unfulfilledPromiseLinkers[key] = new this.#Linker(key, newPromises[key], this);
        }

        return this;
    }

    removePromises(...promisekeys) {
        promisekeys.forEach(key => {
            // Remove the promisebundle from the linker, then the promise from the unfulfilledPromiseLinkers
            const removedLinker = this.#unfulfilledPromiseLinkers[key];
            removedLinker.promiseBundle = undefined;
            delete this.#unfulfilledPromiseLinkers[key];
        });

        this.#checkToRun();

        return this;
    }

    // allow and disable fetch gives the user control on when a fetch can occur, possibly optimizing fetching
    allowFetch() {
        this.#canFetch = true;
        for(const key in this.#unfulfilledPromiseLinkers) {
            this.#unfulfilledPromiseLinkers[key].getFulfilledPromise();
        }

        return this;
    }

    disableFetch() {
        this.#canFetch = false;
        return this;
    }

    // ready and unready set whether the PromiseBundle is allowed to call the function and runs it right away if it can
    ready() {
        this.#ready = true;
        this.#checkToRun();
        return this;
    }

    unready() {
        this.#ready = false;
        return this;
    }

    // Setting strictness: Allows either all or no promise to fail
    strict() {
        this.#isStrict = true;
        return this;
    }

    lax() {
        this.#isStrict = false;
        this.#checkToRun();
        return this;
    }

    // return the data so it can be used, in case anyone needs it
    getData() {
        return {"resolved" : this.#resolvedPromises, "rejected" : this.#rejectedPromises};
    }

    getResolvedData() {
        return this.#resolvedPromises;
    }

    getRejectedData() {
        return this.#rejectedPromises;
    }

    // actually sees if readied and no listeners remaining, then emits the set event
    #checkToRun() {
        // Check if the promise bundle is ready, has any unfulfilled linkers
        if(!this.#ready || !(this.#calledFunction) || Object.keys(this.#unfulfilledPromiseLinkers).length) {
            return;
        }

        // If a promise failed and you are in strict mode, stop
        if(this.#isStrict && Object.keys(this.#rejectedPromises).length) {
            return;
        }

        let paramsArray = [];
        if(this.#sendDataToFunction) {
            paramsArray.push(this.getResolvedData());
        }
        if(this.#functionArgs.length) {
            paramsArray.push(...this.#functionArgs);
        }
        
        this.#calledFunction.apply(null, paramsArray);
    }

    // The linker object, that holds the bundler and the promise together, fetches and sets the data
    #Linker = class PromiseToBundleLinker {
        #id;
        #promise;
        #promiseBundle;
    
        // new PromiseWrapper(id, Promise, bundle)
        // Autofetches the promise
        constructor(id, promise, bundle) {
            this.#id = id;
            this.#promise = promise;
            this.#promiseBundle = bundle;
            this.getFulfilledPromise();
        }
    
        // Fetches the promise, removes itself from the unfulfilled list, adds its data to promisebundle's and calls the bundle's check-to-run
        async getFulfilledPromise() {

            // If the bundler prevents fetching, don't fetch
            if(!this.#promiseBundle.#canFetch) {
                return;
            }

            // Forcefully parse everything into async JSON objects or JSON objects
            await this.#promise
                .then(data => {
                    // Get the results from the promise
                    let results;
                    switch(typeof(data)) {
                        case 'object' :
                            try {
                                results = data.json();
                                break;
                            } catch {}

                        case 'string' :
                            try {
                                results = JSON.parse(data);
                                break;
                            } catch {
                                data = encodeURI(data);
                            };
                        
                        default :
                            results = data;
                    }

                    // Add it to the resolved promises
                    this.#promiseBundle.#resolvedPromises[this.#id] = results;
                })
                .catch(handleRejected => {
                    this.#promiseBundle.#rejectedPromises[this.#id] = encodeURI(handleRejected);
                });
    
            // Put the finished promises into the resolvedPromises object and try running the  promiseBundle's function
            delete(this.#promiseBundle.#unfulfilledPromiseLinkers[this.#id]);
            this.#promiseBundle.#checkToRun();
        }
    }
}

module.exports = PromiseBundle;