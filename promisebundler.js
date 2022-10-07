export default class PromiseBundle{}
// The promisebundle, which mainly puts together the promises through a linker object and checks if everything was fetched
class PromiseBundle {
    #canFetch = false;
    #ready = false;
    #sendDataToFunction;
    #calledFunction;
    #functionArgs;
    #unfulfilledPromiseWrappers = {};
    #fulfilledPromises = [];

    // new PromiseBundle({promisekey1: Promise1, promisekey2: Promise2, promisekey3: Promise3...}, callBackFunction, ?[functionArg1, functionArg2, ...] ?doesItSendItsResultsToFunction)
    constructor(promises, callBackFunction=undefined, functionArgs=[], sendDataToFunction=true) {
        this.addPromises(promises);
        this.#calledFunction = callBackFunction;
        this.#sendDataToFunction = sendDataToFunction;
        this.#functionArgs = functionArgs;
    }

    // add or delete as many promises as you want with a linker and adding it with a key to the object or deleting the key
    addPromises(newPromises) {
        for(const key in newPromises) {
            this.#unfulfilledPromiseWrappers[key] = new this.#Linker(key, newPromises[key], this);
        }

        return this;
    }

    deletePromises(...promisekeys) {
        promisekeys.forEach(key => {
            delete this.#unfulfilledPromiseWrappers[key];
        });

        return this;
    }

    // allow and disable fetch gives the user control on when a fetch can occur, possibly optimizing fetching
    allowFetch() {
        this.#canFetch = true;
        for(const key in this.#unfulfilledPromiseWrappers) {
            this.#unfulfilledPromiseWrappers[key].getFulfilledPromise();
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

    // return the data so it can be used, in case anyone needs it
    getData() {
        return this.#fulfilledPromises;
    }

    // actually sees if readied and no listeners remaining, then emits the set event
    #checkToRun() {
        if(!this.#ready || !(this.#calledFunction) || Object.keys(this.#unfulfilledPromiseWrappers).length) {
            return;
        }

        let paramsArray = [];
        if(this.#sendDataToFunction) {
            paramsArray.push(this.getData());
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
            const results = await this.#promise.then(data => {
                try {
                    data = data.json();
                } catch {
                    data = JSON.parse(data);
                }
                return data;
            });
    
            // Put the finished promises into the fulfilledPromises object and try running the  promiseBundle's function
            delete(this.#promiseBundle.#unfulfilledPromiseWrappers[this.#id]);
            this.#promiseBundle.#fulfilledPromises[this.#id] = results;
            this.#promiseBundle.#checkToRun();
        }
    }
}

/*
// HOW TO USE THIS:

// It looks way more orderly if you define your promises outside of the function

const swapiPromise = fetch("https://swapi.dev/api/people/1");
const stringPromise = new Promise((resolve, reject) => resolve('{"a": true, "b": false}'));


// This *mess* is what it looks like:

    // First a JSON object where you give the resulting json from the promise a key,
    // then a callback function,
    // an optional array of parameters given to the callback function and 
    // a boolean for if you want to send the resulting JSON object too.

// You can always get the JSON object with PromiseBundle.getData(). Also, most methods chain for easier use.

const myBundle = new PromiseBundle(
    {
        "swapi": swapiPromise,
        "stringTest": stringPromise
    },
    bundleResolve,
    [3, "Turtleneck & Chain"],
    true)
        .allowFetch()
        .ready();


// You can call your function all normally like this

function bundleResolve(myData, three, bestAlbum) {
    console.log(myData);
    console.log("I want " + three + " slices of pizza, please!");
    console.log("Best album in the world: " + bestAlbum);
}
*/