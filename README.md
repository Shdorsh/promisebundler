#PromiseBundler

## Purpose

The promisebundler package allows you more freedom and possibilities with bundling promises together.

## Creating a bundle

```
const myBundle = new PromiseBundle(?jsonPromises, ?fulfilledFunction ?fulfilledArgs, ?dataToFunction);
```

 - jsonPromises (optional json object with promises as values)
  - The promises that are being resolved by the bundle. It is optional, because you can also add them later on. The key you assign to each promise is te same key under which the promise's resolved data will be found later on.

  - fulfilledFunction (optional callback function)
    - This function is run when all the promises have been fulfilled and at least one promise resolved. If you are using PromiseBundle.strict(), it will not run as soon as a single promise was rejected.

 - fulfilledArgs (optional array)
    - An array of values that will be given to the callback function when it starts running.

 - dataToFunction (optional boolean)
    - If true, PromiseBundle will send the resolved promises' data automatically into the first argument of the callback function that runs on fulfilling every promise.


## Starting up the promise bundle

The promisebundle starts in an inactive state, disallowing automatic fulfilling of promises and also disallowing its function to run. In order to run this, you need to run the `PromiseBundle.allowFetch()` method and the `PromiseBundle.ready()` function, like this:

```
myBundle.allowFetch().ready();
```

In order for the promisebundle to work correctly, meaning storing the fulfilled promises' data and running the fulfilled function correctly, you have to resolve them using the `PromiseBundle.allowFetch()` method.

Both `PromiseBundle.allowFetch()` and `PromiseBundle.ready()` return myBunde and allow you to chain them.


## How promisebundler treats single promises

Once you use the `PromiseBundle.allowFetch()` method, the promises will be fulfilled by an object named PromiseToBundleLinker, which runs them automatically (for now). If the promises resolve, their resulting data will be treated and saved in a JSON object under the key you provided myBundle with them. A different JSON object will be used for rejected promises. Both can be returned selectively or together with the following 3 methods:

```
myBundle.getResolvedData();
```

For resolved promises, the data will be automatically converted into a json object if possible (string or fetch result). If it is not, the data will be encoded if a string, then stored directly under the promise's key inside of the resolved promises json object.

```
myBundle.getRejectedData();
```

For rejected promises, the errors will be encoded with encodeURI, then saved inside the rejected promises json array.

```
myBundle.getData();
```

`PromiseBundle.getData()` simply wraps both results together under a resolved and rejected key. As such, you would get the following json object:

```
{
   'resolved' : {
      'firstResolvedKey' : firstPromiseData,
      'secondResolvedKey' : secondPromiseData,
      ...
   },
   {
      'rejected' : {
         'firstRejectedKey' : firstRejectedData,
         'secondRejectedKey' : secondRejectedData,
         ...
      }
   }
}
```

## Additional functionalities

### Stopping the promise bundle's fetching and function execution

If you want you can also stop automatic fetching or running of its function. To stop automatic fetching, just type in:

```
myBundle.disableFetch();
```

This stops myBundle from automatically fulfilling promises. As soon as `PromiseBundle.allowFetch()` is called, the promises will be resolved again.

```
myBundle.unready();
```

This stops myBundle from running its stored fulfilling function when all the promises have been resolved if myBundle is set to be strict, or at least one resolved and no unfulfilled promises remain if it is lax. If this however remains the same or myBundle manages to fulfill all the promises while unready, it will run its function as soon as you use `PromiseBundle.ready()`.

Both myBundle.disableFetch() and myBundle.unready() return myBundle and can be chained with the other functions as well.

### Adding promises

You may add and remove promises as much as you want to the bundle.

```
myBundle.addPromises({"myPromise1": promise1, "myPromise2": promise2, ...})
```

As with declaring a new bundle, the key will be used to store the promise's resolved/rejected data under it in the respective json objects.

If you add a promise to myBundle and myBundle already ran its function, it will run it again, with all the data from the previous promises.

Also, `PromiseBundle.addPromises()` returns myBundle and can also be chained with the other functions.

### Removing promises

Likewise, you can remove unfulfilled promises by the key you used to store them.

```
myBundle.removePromises("myPromise1","myPromise2", "myPromise3"...)
```

When you remove unfulfilled promises, myBundle will automatically check if no more unfulfilled promises remain to see if it can run its function.

As with the others, `PromiseBundle.removePromises()` return myBundle and can be chained with the other functions as well.

### Strictness setting

You can change whether myBundle accepts running its function with or without rejected promises. In order to disallow running myBundle's function with rejected promises, use this function:

```
myBundle.strict();
```

The promises will still be fetched if fetches are allowed, but myBundle won't execute its function.

```
myBundle.lax();
```

This allows myBundle to run its function if no unfulfilled promises remain and at least one resolved properly. Using this, it will also make myBundle check and see if it can execute its function right away.

Both `PromiseBundle.strict()` and `PromiseBundle.lax()` return myBundle and can also be chained with all the other functions.