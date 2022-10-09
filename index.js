// The promisebundle, which mainly puts together the promises and checks if everything was fetched
class PromiseBundle {
    #canFetch = false;
    #ready = false;
    #isStrict = false;
    #sendDataToFunction;
    #resolvedFunction = {
        callbackFunction: null,
        args : [],
        thisContext : null
    }
    #rejectedFunction = {
        callbackFunction: null,
        args : [],
        thisContext : null
    }
    #unfulfilledPromises = {};
    #resolvedPromises = {};
    #rejectedPromises = {};

    constructor(promises = {}, resolvedFunctionData=null, rejectedFunctionData=null, sendDataToFunction = true) {
        this.addPromises(promises);
        this.#resolvedFunction = resolvedFunctionData;
        this.#rejectedFunction = rejectedFunctionData;
        this.#sendDataToFunction = sendDataToFunction;
    }

    // allow and disable fetch gives the user control on when a fetch can occur, possibly optimizing fetching
    allowFetch() {
        this.#canFetch = true;
        for(const key in this.#unfulfilledPromises) {
            this.runPromise(key);
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

    clearResolvedData(...keys) {
        if(!keys.length) {
            this.#resolvedPromises = {};
            return this;
        }

        keys.forEach(key => {
            delete this.#resolvedPromises[key];
        })
        return this;
    }

    clearRejectedData(...keys) {
        if(!keys.length) {
            this.#resolvedPromises = {};
            return this;
        }

        keys.forEach(key => {
            delete this.#rejectedPromises[key];
        })
        return this;
    }

    // Running functions

    // Setting functions
    setResolvedFunction(callbackFunction, callbackArgs, callContext) {
        this.#resolvedFunction = {
            'function' : callbackFunction,
            'args' : callbackArgs,
            'thisContext' : callContext
        }

        return this;
    }

    setRejectedFunction(callbackFunction, callbackArgs, callContext) {
        this.#rejectedFunction = {
            'function' : callbackFunction,
            'args' : callbackArgs,
            'thisContext' : callContext 
        }

        return this;
    }

    // actually sees if readied and no listeners remaining, then emits the set event
    #checkToRun() {
        if(!this.#ready) {
            return;
        }

        // Different order of executing checks according to strictness
        const logicTreeShuffler = [];
        if(this.#isStrict) {
            logicTreeShuffler.push(this.#checkRejected, this.#checkUnfulfilled, this.#checkResolved);
        } else {
            logicTreeShuffler.push(this.#checkUnfulfilled, this.#checkResolved, this.#checkRejected);
        }

        for(const logicCheck of logicTreeShuffler) {
            if(logicCheck.call(this)) {
                return;
            }
        }
    }
    
    #checkUnfulfilled() {
        if(Object.keys(this.#unfulfilledPromises).length) {
            return true;
        }

        return false;
    }

    #checkRejected() {
        if(Object.keys(this.#rejectedPromises).length) {
            if(this.#rejectedFunction) {
                this.#useFunction(this.#rejectedFunction, this.getRejectedData());
            }
            return true;
        }

        return false;
    }

    #checkResolved() {
        if(Object.keys(this.#resolvedPromises).length) {
            if(this.#resolvedFunction) {
                this.#useFunction(this.#resolvedFunction, this.getResolvedData());
            }
            return true;
        }
        return false;
    }

    #useFunction(functionData, results) {
        const paramsArray = [];
        if(this.#sendDataToFunction) {
            paramsArray.push(results);
        }
        if(functionData.args) {
            paramsArray.push(...functionData.args);
        }
        
        functionData.callbackFunction.apply(functionData.thisContext, paramsArray);
    }

    // Promises
    // add or delete as many promises as you want with a key to the object or delete the objects with their respective keys
    addPromises(newPromises) {
        for(const key in newPromises) {
            console.log(typeof(newPromises[key]))
            this.#unfulfilledPromises[key] = newPromises[key];
            this.runPromise(key);
        }

        return this;
    }

    removePromises(...promisekeys) {
        promisekeys.forEach(key => {
            // Remove the promise, simply
            delete this.#unfulfilledPromises[key];
        });

        this.#checkToRun();

        return this;
    }

    runPromise(key, disableNoFetch = false) {
        if(!key in this.#unfulfilledPromises) {
            console.error(`Error: Could not find ${key} inside promise bundle!`);
            return this;
        }

        if(!disableNoFetch) {
            if(!this.#canFetch) {
                return;
            }
        }

        this.#makePromiseRun(this.#unfulfilledPromises[key], key);
    }

    async #makePromiseRun(promise, id) {
        await promise.then(data => {
            // Add it to the resolved promises
            this.#resolvedPromises[id] = this.#treatPromiseData(data);
        })
        .catch(handleRejected => {
            this.#rejectedPromises[id] = this.#treatPromiseData(handleRejected);
        });

        // Put the finished promises into the resolvedPromises object and try running the  promiseBundle's function
        delete(this.#unfulfilledPromises[id]);
        this.#checkToRun();
    }

    #treatPromiseData(data) {
        switch(typeof(data)) {
            case 'object' :
                try {
                    return data.json();
                } catch {}

            case 'string' :
                try {
                    return JSON.parse(data);
                } catch {
                    data = data.replace(`"`,`\"`).replace("'","\'").replace('`','\`');
                };
            
            default :
                return data;
        }
    }
}




// HOW TO USE THIS:

// It looks way more orderly if you define your promises outside of the function

const swapiPromise = fetch("https://swapi.dev/api/people/1");
const jsonStringPromise = new Promise((resolve, reject) => resolve('{"a": true, "b": false}'));
const numberPromise = new Promise((resolve, reject) => reject(65));


// This *mess* is what it looks like:

    // First a JSON object where you give the resulting json from the promise a key,
    // then a callback function,
    // an optional array of parameters given to the callback function and 
    // a boolean for if you want to send the resulting JSON object too.

// You can always get the JSON object with PromiseBundle.getData(). Also, most methods chain for easier use.

const myBundle = new PromiseBundle(
    {
        "swapi" : swapiPromise,
        "jsonString" : jsonStringPromise,
        "number" : numberPromise
    },
    {
        callbackFunction: bundleResolve,
        args: [3, "Turtleneck & Chain"],
        thisContext: null
    },
    null,
    true)
        .allowFetch()
        .ready();


// You can call your function all normally like this

function bundleResolve(myData, three, bestAlbum) {
    //console.log("test");
    console.log(myBundle.getData());
    //console.log("I want " + three + " slices of pizza, please!");
    //console.log("Best album in the world: " + bestAlbum);

    myBundle.addPromises(
        {
            'theyAddItAgainAgnes': new Promise((resolve, reject) => {
                resolve(`that's it hun, exactly how my bros at lmfao said: "sorry for party rockin! Now let's get funky in this town!`);
            })
        });
}