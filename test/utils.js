const EventHandler = require('events');
const queryString = require('query-string');
const { MockRequestError } = require('../dist/bloom-orm.cjs').errors;

/**
 * Mock rest api adapter. Replaces the axios.request object passed to rest
 * adapters.
 * TODO: Consider turning this into an axios adapter instead so we can mock
 * any of its api calls.
 */
class MockRestAdapter extends EventHandler {
    constructor() {
        super();

        this._requestHandlers = [];
        this._requests = [];
    }

    /**
     * Mock server request handler. Given a request method and url the third
     * parameter will be called to process the request. If an object is passed
     * instead, that object will be used as the response.
     * @param {string} method Request method: get, put, post, delete
     * @param {*} url A url string or regex
     * @param {*} cb A processor callback or object to return as response.
     * @example
     * mockServer.onRequest('get', /myserver\/address/, function(req) {
     *   return {
     *     status: 200,
     *     response: { message: 'all good' }
     *   }
     * });
     */
    onRequest(method, url, cb) {
        let req = {
            method,
            url,
            cb
        }
        this._requestHandlers.push(req);
    }

    /**
     * This matches the axios request instance api signature.
     * See axios documentation.
     * @param {object} opts 
     */
    request(opts) {
        let parts = opts.url.split('?', 2);
        let req = Object.assign({
            request: {
                resolve: null,
                reject: null,
                queryString: parts.length > 1 ? parts[1] : '',
                query: queryString.parse(parts.length > 1 ? parts[1] : ''),
                url: parts[0]
            },
            promise: null
        }, opts);

        req.promise = new Promise((resolve, reject) => {
            req.request.resolve = resolve;
            req.request.reject = reject;
            return null;
        });

        this._requests.push(req);

        return req.promise;
    }

    /**
     * Helper method used to find and process request handlers for the queued requests.
     * @param {object} req 
     * @returns {Promise} Returns a promise so we can wait for any chained requests there after.
     */
    _processRequest(req) {
        // find handler matching url
        let matchedUrl = '';
        let handler = this._requestHandlers.reduce((c, h) => {
            if (req.method.toLowerCase() == h.method.toLowerCase() &&
                req.url.search(h.url) > -1) {
                req.request.urlPattern = h.url;
                if ( h.url.constructor == RegExp ) {
                    req.request.urlMatches = h.url.exec(req.url);
                } else {
                    req.request.urlMatches = null;
                }
                return h;
            }

            return c;
        }, null);

        if (handler) {
            let response = null;
            if (typeof handler.cb == 'function') {
                response = handler.cb(req);
            } else {
                response = handler.cb;
            }

            if (this.validateStatus(response.status)) {
                req.request.resolve({
                    status: response.status,
                    data: response.response
                });
            } else {
                req.request.reject(new MockRequestError(response));
            }

            // poor man's promize.settle
            return new Promise((resolve, reject) => {
                req.promise.catch(r => {
                    reject();
                    return r;
                }).then(r => {
                    resolve();
                    return r;
                });
            });

        } else {
            throw new Error(`No matching request handler found for: ${JSON.stringify(req, null, '  ')}`)
        }
    }

    /**
     * Helper method used to continuosly check our request queue.
     * @param {Array} promises Array of promises this method will expand as requests are handled.
     * @param {*} timeout A timeout in milliseconds when next tick should happen.
     * @param {*} counter An internal ticker counter used to break loop if we are only listening for a given number of requests.
     * @param {*} expectedRequests A user counter to break loop if given number of requests are completed.
     * @param {*} resolve The promise resolution method called once we are done processing requests.
     */
    _waitNextTick(promises, timeout, counter, expectedRequests, resolve) {
        if ( this._requests.length > 0 ) {
            let req = this._requests.shift();
            promises.push(this._processRequest(req));
            expectedRequests -= 1;
        }

        // expectedRequests < 0 so we have at least one more tick to handle code called
        // inside promises.
        if (counter < 0 || expectedRequests < 0 || this._stoped ) {
            resolve();
        } else {
            setTimeout(this._waitNextTick.bind(this, promises, timeout, counter - 1, expectedRequests, resolve), timeout);
        }
    }

    /**
     * Starts mock server processing for up to certain number of expected requests or timeout * tickMax cycles
     * @param {int} expectedRequests Total number of requests to listen for (default Infinity)
     * @param {int} timeout A ticker timeout to call mock server processing (default 5 milliseconds)
     * @param {int} tickMax Number of ticker calls to make (default 200)
     * @returns {Promise} Promise fullfilled when all processed requets have finished.
     */
    wait(expectedRequests=Infinity, timeout=5, tickMax=200) {
        let promises = [];
        this._stoped = false;
        return new Promise((waitResolve) => {
            // naive tiemout ticker, will check for requests on timeout until
            // counter is depleted.
            this._waitNextTick(promises, timeout, tickMax, expectedRequests, waitResolve);
            return null;
        }).then((r) => {
            // after timeout give all promises a chance to resolve
            this._stoped = true;
            return Promise.all(promises);
        });
    }

    /**
     * Starts mock server auto listen mode.
     * @param {*} timeout Timeout between ticks
     * @returns {Promise} Promise fullfilled when all processed requests have finished.
     */
    start(timeout=5) {
        this._autoPromise = this.wait(Infinity, timeout, Infinity);
        return this._autoPromise;
    }

    /**
     * Stops mock server auto listen mode.
     * @returns {Promise} Promise fullfilled when all processed requests have finished.
     */
    stop() {
        this._stoped = true;
        return this._autoPromise;
    }

    /**
     * Helper method that defines which server status resolve or rejects. This defaults
     * to the same one used in axios. Only replace if you know what you are doing.
     * @param {int} status 
     * @returns {boolean} True to resove, false to reject
     */
    validateStatus(status) {
        return status >= 200 && status < 300; // default
    }
}

module.exports = {
    MockRestAdapter,
    PromiseFinally(p, fn) {
        return p
            .catch(err => {
                fn(null, err);
                return err;
            })
            .then(result => {
                fn(result, null)
                return result;
            });
    }
}