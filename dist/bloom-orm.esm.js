import { EventEmitter } from 'events';

/**
 * This is the default implementation of a query ascending behaviour.
 * Usually, custom models may replace this function generate their internal
 * query language.
 * @example
 * // used on a fetch query on some model.
 * model.fetch({ orderby: r => asc(r.id) });
 * @param {string} col The column to order in ascending order
 * @returns {function} A comparison function to use between two objects
 */
function asc(col) {
    return function (a, b) {
        return a[col] - b[col];
    }
}

/**
 * This is the default implementation of a query descending behaviour.
 * Usually, custom models may replace this function generate their internal
 * query language.
 * @example
 * // used on a fetch query on some model.
 * model.fetch({ orderby: r => desc(r.id) });
 * @param {string} col The column to order in descending order
 * @returns {function} A comparison function to use between two objects
 */
function desc(col) {
    return function (a, b) {
        return b[col] - a[col];
    }
}

/**
 * Helper function. It accumulates an array of asc or desc calls to implement
 * multi column sorting for local stores. It is usually used internally and should
 * not be used outside of building custom models.
 * @example
 * // multi column sorting
 * [
 *  {a: 1, b:1}, 
 *  {a:1, b: 2}, 
 *  {a: 2, b:1}, 
 *  {a: 2, b: 2}
 * ].sort(multiColSort([asc('a'), desc('b')]))
 * // result:
 * [
 *  {a: 1, b: 2},
 *  {a: 1, b: 1},
 *  {a: 2, b: 2},
 *  {a: 2, b: 1}
 * ]
 * @param {Array} orderby An array or single asc/desc function to accumulate
 * @returns {function} A comparison function which combines the provided array of sort functions.
 */
function multiColSort(orderby) {
    if (orderby.constructor !== Array) {
        orderby = [orderby];
    }

    let fn = orderby.shift();
    return function (a, b) {
        let result = fn(a, b);
        if (result === 0 && orderby.length > 0) {
            return multiColSort(orderby)(a, b);
        }

        return result;
    }
}

/**
 * 
 * @param {*} fn A value to test if is considered an arrow function.
 * @returns {boolean} true or false
 */
function isArrowFunction(fn) {
    let fnSrc = fn.toString();
    return (/^\s*(\(\s*\)|\([a-z0-9_=,\s+\{\}\.]+\)|[a-z0-9_\.]+)\s*=>.+/).test(fnSrc);
}

var queryUtils = /*#__PURE__*/Object.freeze({
    asc: asc,
    desc: desc,
    multiColSort: multiColSort,
    isArrowFunction: isArrowFunction
});

// TODO: Implement model schema definitions to automate validation
class Schema {
    constructor(options) {
        this.options = options;
    }

    validate(field, value) {
        // TODO: validate agaisnt json schema
    }
}

/**
 * Base Model abstract class. All models should implement all methods on this class.
 * @extends EventEmitter
 */
class ModelBase extends EventEmitter{
    /**
     * 
     * @param {*} options
     */
    constructor(options) {
        super();
        this.options = Object.assign({
            primary_key: 'id'
        }, options);
    }

    /**
     * @returns {Promise} Resolves if connected else rejects.
     */
    async isConnected() {
        return Promise.reject();
    }

    /**
     * Connects the model to its backend.
     * @param {*} data Any object to pass along when Promise chained.
     * @returns {Promise} A promise resolved once the model's backend is connected.
     */
    async connect(data) {
        return new Promise.resolve(data);
    }

    /**
     * Disconnects the model from its backend
     * @param {*} data Any object to pass along when Promise chained.
     * @returns {Promise} A promise resolved once the model's backend is disconnected.
     */
    async disconnect(data) {
        return new Promise.resolve(data);
    }

    /**
     * Data fetch method. Accepts either a 'where' arrow function or more complex
     * object containing where, orderby, start, limit options.
     * @param {*} query 
     */
    async fetch(query) {
        return new Promise.resolve({ rows: [], total: 0 });
    }

    /**
     * Updates an array of data
     * @param {Array} rows
     * @returns {Promise}
     */
    async update(rows) {
        return new Promise.resolve({ rows: [] });
    }

    /**
     * Creates a list of records.
     * @param {Array} rows 
     * @returns {Promise} List of records created.
     */
    async create(rows) {
        return new Promise.resolve({ rows: [] });
    }

    /**
     * Delete records by ids
     * @param {Array} ids The records ids to delete.
     * @returns {Promise}
     */
    async delete(rows) {
        return new Promise.resolve({ rows: [] });
    }

}

/**
 * A convenient event argument container that allows async processing for subscribing events.
 * @example
 * // simple event
 * let EventEmitter = require('event');
 * let emitter = new EventEmitter();
 * let e = new AsyncEvent('myevent', emitter, { a: 1});
 * emitter.on('myevent', e => {
 *   // emulate a long running promise,
 *   // any event that requies pausing further flow can insert a promise.
 *   e.await(new Promise(resolve => {
 *     setTimeout(resolve, 5000);
 *   }));
 * })
 * 
 * // triggers events and waits until all event promises resolve
 * e.wait().then(() => {
 *  console.log("Called after all event promises are resolved");
 * })
 */
class AsyncEvent {

    /**
     * 
     * @param {string} eventName Event Name.
     * @param {*} base EventHandler instance to trigger event in behalve of.
     * @param {*} args Event arguments to pass during event trigger.
     */
    constructor(eventName, base, args={}) {
        this._base = base;
        this.args = args;
        this._promises = [];
        this._eventName = eventName;
    }

    /**
     * If an event handler needs to run a long running process, this method
     * allows them the insert a promise into a wait queue so implementing code
     * can wait for these promises to resolve or be rejected.
     * @param {Promise} promise A promise to add to our wait list
     */
    await(promise) {
        this._promises.push(promise);
    }

    /**
     * If event handlers added long running promisses through the await function this method can be used
     * to chain more processes that should only run after these event promises have resolved.
     * @param {*} data A convenient way to enable this method to be chained. 
     *                 Any data passed will be passed along untouched down at the end of the wait promise.
     * @returns {Promise} A promise which will pass the provided data object if passed.
     */
    wait(data) {
        this._base.emit(this._eventName, {
            name: this._eventName,
            target: this._base,
            args: this.args,
            await: this.await.bind(this)
        });
        return Promise.all(this._promises).then(() => data);
    }
}

/**
 * A model facade class that encapsulates promise handling and connection management.
 * @extends ModelBase
 */
class ModelProxy extends ModelBase {

    /**
     * 
     * @param {object} options Model configuration
     * @param {(constructor|string)} options.adapter Adapter constructor to load or instantiate.
     * @param {string} options.primary_key The field name of the model's primary key (default: 'id')
     * @param {object} options.schema A json schema object defining the fields of the model. Not all models require it as usually this would al ready exists for selfcontained models.
     * @param {boolean} options.autoDisconnect If true, an extra call to disconnect() will be added to the promise chain.
     */
    constructor(options) {
        super(options);

        if (typeof this.options.model == 'string') {
            this._model = new require(this.options.model)(options);
        } else {
            this._model = new options.model(this.options);
        }
    }

    get primaryKey() {
        return this.options.primary_key;
    }

    recordDecorator(record) {
        record.$id = record[this.options.primary_key];
        return record;
    }

    async isConnected(data) {
        return this._model.isConnected(data);
    }

    /**
     * Connects the model to its backend.
     * @param {*} data Any object to pass along when Promise chained.
     * @fires beforeConnect Before connecting event.
     * @fires afterConnect After connecting event.
     * @returns {Promise} A promise resolved once the model's backend is connected.
     */
    async connect(data) {
        /**
         * Before connecting
         * @event ModelProxy#beforeConnect
         * @type {AsyncEvent}
         */
        let beforeConnectEvent = new AsyncEvent('beforeConnect', this, {});

        /**
         * After connecting
         * @event ModelProxy#afterConnect
         * @type {AsyncEvent}
         */

        return beforeConnectEvent.wait(data)
            .then(data => this._model.connect(data))
            .then(data => new AsyncEvent('afterConnect', this, {}).wait(data))
    }

    /**
     * Disconnects the model from its backend
     * @param {*} data Any object to pass along when Promise chained.
     * @fires beforeDisconnect Before disconnecting event.
     * @fires afterDisconnect After disconnecting event.
     * @returns {Promise} A promise resolved once the model's backend is disconnected.
     */
    async disconnect(data) {
        /**
         * Before disconnecting
         * @event ModelProxy#beforeDisconnect
         * @type {AsyncEvent}
         */
        let beforeDisconnectEvent = new AsyncEvent('beforeDisconnect', this, {});

        /**
         * After disconnecting
         * @event ModelProxy#aftereDisconnect
         * @type {AsyncEvent}
         */

        return beforeDisconnectEvent.wait(data)
            .then(data => this._model.disconnect(data))
            .then(data => new AsyncEvent('afterDisconnect', this, {}).wait(data))
    }

    /**
     * Data fetch method. Accepts either a 'where' arrow function or more complex
     * object containing where, orderby, start, limit options.
     * @param {(function|object)} query Query arrow function or object containing query definition.
     * @param {function} query.where An arror function defining where operation(an arrow function is required)
     * @param {function} query.orderby An arrow function defining sorting(an arrow function is required)
     * @param {int} query.start Pagination start index
     * @param {int} query.limit Pagination record length
     * @fires beforeFetch Before disconnecting event.
     * @fires afterFetch After disconnecting event.
     * @returns {Promise.<object>} When fulfilled promise returns: { rows: <Array>, total: <int> }
     */
    async fetch(query={}) {

        /** Accept an arrow function as 'where' condition */
        if (isArrowFunction(query)) {
            query = { where: query };
        }

        if ( !('limit' in query) ) {
            query.limit = 20;
        }

        if (!('start' in query)) {
            query.start = 0;
        }

        let chain = this._model.isConnected(query)
            .catch(() => {
                return this.connect(query)
            });

        /**
         * Before fetch
         * @event ModelProxy#beforeFetch
         * @property {object} query Query object containing, where, orderby, start and limit properties.
         * @property {function} query.where A where arrow function definition.
         * @property {function} query.orderby A record order by definition arrow function.
         * @property {int} query.start The record start index, used in pagination mostly.
         * @property {int} query.limit The maximum number of records to return.
         * @type {AsyncEvent}
         */
        let beforeFetchEvent = new AsyncEvent('beforeFetch', this, { query });

        /**
         * After fetch
         * @event ModelProxy#afterFetch
         * @property {object} result A query result object containing records fetched.
         * @property {Array} result.rows Records fetched.
         * @type {AsyncEvent}
         */

        chain = chain.then(query => beforeFetchEvent.wait(query))
            .then(query => this._model.fetch(query))
            .then(result => new AsyncEvent('afterFetch', this, { result }).wait(result));

        if (this.options.autoDisconnect) {
            chain = chain.then(result => this.disconnect(result));
        }

        return chain;
    }

    /**
     * Updates an array of data
     * @param {(object|Array)} data  object containing a 'rows' array key with records to update. You may also pass just an array of rows.
     * @param {Array} data.rows  object containing a 'rows' array key with records to update. You may also pass just an array of rows.
     * @fires beforeUpdate Before disconnecting event.
     * @fires afterUpdate After disconnecting event.
     * @returns {Promise.<object>} When fulfilled promise returns: { rows: <Array> }
     */
    async update(data) {

        if (data.constructor == Array ) {
            data = { rows: data };
        }

        let chain = this._model.isConnected(data)
            .catch(() => {
                return this.connect(data)
            });


        /**
         * Before update
         * @event ModelProxy#beforeUpdate
         * @property { object } data 
         * @property { Array } data.rows Array of records to update.
         * @type {AsyncEvent}
         */
        let beforeUpdateEvent = new AsyncEvent('beforeUpdate', this, data);

        /**
         * After update
         * @event ModelProxy#afterUpdate
         * @property { object } data 
         * @property { Array } data.rows Array of updated records.
         * @type {AsyncEvent}
         */

        chain = chain.then(data => beforeUpdateEvent.wait(data))
            .then(data => this._model.update(data))
            .then(data => new AsyncEvent('afterUpdate', this, data).wait(data));

        if (this.options.autoDisconnect) {
            chain = chain.then(result => this.disconnect(result));
        }

        return chain;
    }

    /**
     * Creates a list of records.
     * @param {(object|Array)} data Either an Array of records or an object containing an Array key named 'rows'.
     * @param {Array} data.rows Array containing records to create.
     * @fires beforeCreate Before disconnecting event.
     * @fires afterCreate After disconnecting event.
     * @returns {Promise.<object>} List of records created. Object signature: { rows: <Array> }
     */
    async create(data) {

        if ( data.constructor == Array ) {
            data = { rows: data };
        }

        let chain = this._model.isConnected(data)
            .catch(() => {
                return this.connect(data)
            });

        /**
         * Before create
         * @event ModelProxy#beforeCreate
         * @property {object} data Object with records to create.
         * @property {Array} data.rows Records to create.
         * @type {AsyncEvent}
         */
        let beforeCreateEvent = new AsyncEvent('beforeCreate', this, data);

        /**
         * After create
         * @event ModelProxy#aftereCreate
         * @property {Array} data Object containing new records.
         * @property {Array} data.rows Array of records created.
         * @type {AsyncEvent}
         */

        chain = chain.then(data => beforeCreateEvent.wait(data))
            .then(data => this._model.create(data))
            .then(data => new AsyncEvent('afterCreate', this, data).wait(data));

        if (this.options.autoDisconnect) {
            chain = chain.then(result => this.disconnect(result));
        }

        return chain;
    }

    /**
     * Delete records by ids
     * @param {Array} ids The records ids to delete.
     * @fires beforeDelete Before disconnecting event.
     * @fires afterDelete After disconnecting event.
     * @returns {Promise.<Array>} When fulfilled promise returns an array of deleted ids.
     */
    async delete(ids) {
        let chain = this._model.isConnected(ids)
            .catch(() => {
                return this.connect(ids)
            });


        /**
         * Before delete
         * @event ModelProxy#beforeDelete
         * @property {object} data 
         * @property {Array} data.ids The record ids to delete.
         * @type {AsyncEvent}
         */
        let beforeDeleteEvent = new AsyncEvent('beforeDelete', this, { ids });

        /**
         * After delete
         * @event ModelProxy#aftereDelete
         * @property {object} data
         * @property {Array} data.ids The record ids deleted.
         * @type {AsyncEvent}
         */

        chain = chain.then(ids => beforeDeleteEvent.wait(ids))
            .then(ids => this._model.delete(ids))
            .then(ids => new AsyncEvent('afterDelete', this, { ids }).wait(ids));

        if (this.options.autoDisconnect) {
            chain = chain.then(result => this.disconnect(result));
        }

        return chain;
    }
}

/**
 * Reference model implementation based on simple object arrays
 * @extends ModelBase
 */
class ArrayModel extends ModelBase {
    constructor(options) {
        super(options);
        this._data = this.options.data;
        this._connected = false;
    }

    /**
     * @returns {Promise} Resolves if connected else rejects
     * @override
     */
    async isConnected(data) {
        if ( this._connected ) {
            return Promise.resolve(data);
        }
        return Promise.reject(false);
    }

    /**
     * To simulate and stay api compliant, this model implements connecting/disconnecting behaviour.
     * @param {*} data 
     * @returns {Promise}
     * @override
     */
    async connect(data) {
        return new Promise(resolve => {
            this._connected = true;
            return resolve(data)
        });
    }

    /**
     * To simulate and stay api compliant, this model implements connecting/disconnecting behaviour.
     * @param {*} data 
     * @returns {Promise}
     * @override
     */
    async disconnect(data) {
        return new Promise(resolve => {
            this._connected = false;
            return resolve(data)
        });
    }

    /**
     * Fetches rows using where, order, start and limit query parameters
     * @param {*} query An object containing a set of query definitions.
     * @param {function} query.where An arror function defining where operation(an arrow function is required)
     * @param {function} query.orderby An arrow function defining sorting(an arrow function is required)
     * @param {int} query.start Pagination start index
     * @param {int} query.limit Pagination record length
     * @returns {Promise}
     * @override
     */
    async fetch({ where, orderby, start, limit }) {
        return new Promise(success => {
            let result = {
                rows: [],
                total: 100
            };

            if (start === undefined) { start = 0; }
            if (limit === undefined) { limit = 20; }
            for (let i = 0; i < this._data.length; i++) {
                let row = Object.assign({
                    $id: this._data[i][this.options.primary_key]
                }, this._data[i]);

                let matchCondition = where ? where(row) : true;
                if (matchCondition) {
                    result.rows.push(row);
                }
            }

            let rowFields = Object.assign({
                $id: this.options.primary_key
            }, this.options.schema.properties);

            if (orderby) {
                result.rows = result.rows.sort(multiColSort(orderby(rowFields)));
            }

            result.rows = result.rows.slice(start, start + limit);

            result.rows.forEach(r => {
                delete r.$id;
            });

            return success(result);
        });
    }

    /**
     * Updates rows provided by passing an object containing a "rows" array property.
     * @param {*} data Object containing rows in a "rows" property
     * @returns {Promise} Returns the provided data with the rows updated.
     * @override
     */
    async update(data) {
        return new Promise(success => {
            data.rows.forEach(row => {

                this._data.find((r, i) => {
                    if (r.id == row.id) {
                        this._data[i] = row;
                        return true;
                    }
                });

            });
            return success(data);
        });
    }

    /**
     * Deletes all records matching the provided ids.
     * @param {Array} ids 
     * @returns {Promise}
     * @override
     */
    async delete(ids) {
        return new Promise(success => {
            ids.forEach((id) => {
                this._data.find((r, i) => {
                    if (r.id == id) {
                        this._data.splice(i, 1);
                        return true;
                    }
                });
            });

            return success(ids);
        });
    }

    /**
     * Creates all the records provided. Returning the same records updated with their identifier.
     * @param {Array} rows Array of records to create
     * @returns {Promise}
     * @override
     */
    async create(data) {
        return new Promise(success => {
            let lastId = this._data[this._data.length - 1].id;
            data.rows.forEach((row, i) => {
                row.id = ++lastId;
                this._data.push(row);
            });

            success(data);
        });
    }

}

/**
 * A Timeout Error
 */
class TimeoutError extends Error {
    constructor() {
        super('A timeout has occured');
        this.name = 'TimeoutError';
    }
}

class RemoteError extends Error {
    constructor(service, msg, stack) {
        super(`A remote service error has occured (${service}) => ${msg}`);
        this.name = "RemoteError";
        this.service = service;
        this.remoteStack = stack;
    }
}

class UnexpectedResponseError extends Error {
    constructor(service, sample, msg) {
        super(`Remote service (${service}) responded with unexpected data => ${msg}`);
        this.name = "UnexpectedRemoteResponse";
        this.service = service;
        this.sample = sample;
    }
}

class MockRequestError extends Error {
    constructor(response, request) {
        super(`Mock Request Error: ${response.status}: ${response.statusText}`);
        this.response = response;
        this.request = request;
    }
}

var errors = /*#__PURE__*/Object.freeze({
    TimeoutError: TimeoutError,
    RemoteError: RemoteError,
    UnexpectedResponseError: UnexpectedResponseError,
    MockRequestError: MockRequestError
});

const axios = require('axios');

function leftPadLines(lines, padding, skip=0) {
    lines = JSON.stringify(lines, null, 4).trim().split("\n");

    return lines.reduce((c, v, i) => {
        if ( i <= skip ) {
            return c + v;
        } else {
            return c + "\n" + Array(padding).join(" ") + v;
        }
    }, '')
}

function capitalize(value, skip) {
    if ( value.constructor !== Array ) {
        value = [value];
    }

    return value.reduce((c, v, i) => {
        if ( i <= skip ) {
            c.push(v);
        } else {
            c.push(v.charAt(0).toUpperCase() + v.slice(1));
        }
        return c;
    }, []);
}

function normalizeField(value) {
    return capitalize(value.split(' '), 1).join('');
}

/**
 * A generic and extensible Rest model.
 * @extends ModelBase
 */
class RestModel extends ModelBase {
    constructor(options) {
        super(options);

        this._connected = false;
        this.cookies = {};
        this.fields = [];
        this.meta = {
            fields: {
                $id: this.options.primary_key
            }
        };

        this._http = this.options.http || axios.create({
            validateStatus: function (status) {
                return status >= 200 && status < 300; // default
            }
        });

        if (this.options.schema) {
            this.fields = Object.keys(this.options.schema.properties);

            for(let i in this.fields) {
                let field = this.fields[i];
                let normalizedField = normalizeField(field);
                this.meta.fields[normalizedField] = field;
            }
        }
    }

    getEndPoint(action, options, id, args, data) {
        let argStr = '';
        if ( action == 'fetch' ) {
            let tmpArgs = [];
            for(var k in args) {
                if (args[k] !== undefined) {
                    tmpArgs.push(`${k}=${encodeURIComponent(args[k])}`);
                }
            }
            argStr = tmpArgs.join('&');
        }
        let ACTIONS = {
            connect: {
                url: `${options.baseUrl}/login`,
                method: 'get'
            },
            disconnect: {
                url: `${options.baseUrl}/logout`,
                method: 'get'      
            },
            fetch: {
                url: `${options.baseUrl}/resource/${this.options.resource}${id ? '/' + id : ''}${argStr ? '?' + argStr : ''}`,
                method: 'get'
            },
            create: {
                url: `${options.baseUrl}/resource/${this.options.resource}`,
                method: 'post',
                data
            },
            update: {
                url: `${options.baseUrl}/resource/${this.options.resource}`,
                method: 'put',
                data
            },
            delete: {
                url: `${options.baseUrl}/resource/${this.options.resource}/${id}`,
                method: 'delete'
            },
            default: {
                url: `${options.baseUrl}`,
                method: 'get'
            }
        };

        let finalAction = null;
        if ( typeof this.options.getEndPoint == 'function' ) {
            finalAction = this.options.getEndPoint(action, options, id);
        } else {
            finalAction = action in ACTIONS ? ACTIONS[action] : ACTIONS.default;
        }

        if ( this.options.debug ) {
            console.log("endPoint: ", finalAction);
        }

        return finalAction;
    }

    HTTP(endPoint) {

        let opts = Object.assign({
            method: 'GET',
            withCredentials: true        
        }, endPoint);

        if (this.options.debug) {
            console.log('\nHTTP CALL : ', leftPadLines(endPoint, 14));
            console.log('   - OPTS : ', leftPadLines(opts, 14));
        }

        return this._http.request(opts);
    }



    /**
     * @returns {Promise} true when connected
     * @override
     */
    async isConnected(data) {
        let isConnectedPromise = null;
        if (typeof this.options.isConnected == 'function') {
            isConnectedPromise = this.options.isConnected();
        } else if ( this._connected ) {
            this.isConnectedPromise = Promise.resolve(data);
        } else {
            this.isConnectedPromise = Promise.reject();
        }

        return isConnectedPromise.then((data) => {
            this._connected = true;
            return data;
        })
        .catch(() => {
            this._connected = false;
        })
    }

    /**
     * To simulate and stay api compliant, this model implements connecting/disconnecting behaviour.
     * @param {*} data 
     * @returns {Promise}
     * @override
     */
    async connect(data) {
        let connectPromise = null;
        let endPoint = this.getEndPoint('connect', this.options);

        // allow overwriting connect promise with user version if required.
        if ( this.options.connect ) {
            connectPromise = this.options.connect(endPoint, this.options, this.HTTP.bind(this));
        } else {
            connectPromise = this.HTTP(endPoint);
        }

        // either way, the promise must return a response that at least contains
        // the status key with the resulting http response code.
        return connectPromise.then(response => {
            this._connected = true;
            return response.data;
        }).catch(err => {
            let response = err.response;
            this._connected = false;
            return Promise.reject(new RemoteError("REST", `${response.status}: ${response.statusText}`, response.data));
        });

    }

    /**
     * To simulate and stay api compliant, this model implements connecting/disconnecting behaviour.
     * @param {*} data 
     * @returns {Promise}
     * @override
     */
    async disconnect(data) {
        let disconnectPromise = null;
        let endPoint = this.getEndPoint('disconnect', this.options);
        if (this.options.disconnect) {
            disconnectPromise = this.options.disconnect(endPoint, this.options, this.HTTP.bind(this));
        } else {
            disconnectPromise = this.HTTP(endPoint);
        }

        return disconnectPromise.then(response => {
            if ( response.status == 200) {
                this._connected = false;
                return data;
            } else {
                this._connected = false;
                throw new Error("Error while disconnecting")
            }
        });
    }

    /**
     * Fetches rows using where, order, start and limit query parameters
     * @param {*} query An object containing a set of query definitions.
     * @returns {Promise}
     * @override
     */
    async fetch({ where, orderby, start, limit }) {
        return new Promise((resolve, reject) => {

            let whereAst, orderbyAst;

            if ( where ) {
                whereAst = jsep(where.toString());
            }

            if ( orderby ) {
                orderbyAst = jsep(orderby.toString());
            }

            if (start === undefined) { start = 0; }
            if (limit === undefined) { limit = 20; }

            
            let endPoint = this.getEndPoint('fetch', this.options);
            return this.HTTP(endPoint);
        });
    }

    /**
     * Updates rows provided by passing an object containing a "rows" array property.
     * @param {*} data Object containing rows in a "rows" property
     * @returns {Promise} Returns the provided data with the rows updated.
     * @override
     */
    async update(data) {
        let promises = [];
        data.rows.forEach(row => {
            let endPoint = this.getEndPoint('update', this.options, row.id, null, row);
            promises.push(this.HTTP(endPoint).then(result => { 
                return result.data.data 
            }));
        });

        return Promise.all(promises).then(results => {
            return {
                rows: results
            };
        });
    }

    /**
     * Deletes all records matching the provided ids.
     * @param {Array} ids 
     * @returns {Promise}
     * @override
     */
    async delete(ids) {
        let promises = [];
        ids.forEach(id => {
            let endPoint = this.getEndPoint('delete', this.options, id);
            promises.push((function (endPoint, id) { 
                return this.HTTP(endPoint).then(result => {
                    return id;
                }).catch(err => {
                    return {
                        id,
                        errorMessage: "Error deleting record",
                        debug: err
                    }
                });
            }.bind(this))(endPoint, id));
        });

        return Promise.all(promises).then(results => {
            return {
                rows: results
            };
        });
    }

    /**
     * Creates all the records provided. Returning the same records updated with their identifier.
     * @param {Array} rows Array of records to create
     * @returns {Promise}
     * @override
     */
    async create(data) {
        let promises = [];
        data.rows.forEach(row => {
            let endPoint = this.getEndPoint('create', this.options, null, null, row);
            promises.push(this.HTTP(endPoint).then(result => {
                return result.data.data
            }));
        });

        return Promise.all(promises).then(results => {
            return {
                rows: results
            };
        });
    }

}

const jsep$1 = require('jsep');
jsep$1.addBinaryOp("^");
jsep$1.addUnaryOp('@');
jsep$1.removeBinaryOp(">>>");
jsep$1.removeBinaryOp("<<<");
jsep$1.removeUnaryOp("~");

class ExpressionBuilder {
    constructor(options) {
        this.options = options;
        this.ast = null;
    }

    parse(expOrArrowFn) {
        let src = expOrArrowFn.toString();
        let rx = /([^=>]+)\s*=>\s*(.+)/gi;
        let result = rx.exec(src);
        this.ast = jsep$1(result[2]);
        return this;
    }

    transform(transform) {
        if ( !transform  ) {
            transform = this.options.transform;
        }

        return transform.run(this.ast);
    }

}

class AstTransform {
    constructor(state, opts) {
        this.state = state;
        this.options = Object.assign({
            debug: false,
            allowBinaryExpressions: true,
            allowLogicalExpressions: true,
            allowMemberExpressions: true,
            allowCallExpressions: true,
            allowLiterals: true,
            allowIdentifier: true,
            allowArrayExpression: false
        }, opts);
    }

    run(ast) {
        if ( this.options.debug ) {
            console.log(JSON.stringify(ast, null, '  '));
        }

        let expFn = this.buildAstFnTree(ast);
        return expFn();
    }

    buildAstFnTree(ast) {       
        let expFn = null;
        if (ast.type == 'BinaryExpression' && this.options.allowBinaryExpressions ) {
            expFn = this.onBinaryExpression.bind(this, 
                ast.operator,
                this.buildAstFnTree(ast.left),
                this.buildAstFnTree(ast.right)
            );
        } else if (ast.type == 'LogicalExpression' && this.options.allowLogicalExpressions ) {
            expFn = this.onLogicalExpression.bind(this,
                ast.operator,
                this.buildAstFnTree(ast.left),
                this.buildAstFnTree(ast.right)
            );
        } else if (ast.type == 'MemberExpression' && this.options.allowMemberExpressions ) {
            expFn = this.onMemberExpression.bind(this,
                ast.computed,
                this.buildAstFnTree(ast.object),
                this.buildAstFnTree(ast.property)
            );
        } else if (ast.type == 'Identifier' && this.options.allowIdentifier ) {
            expFn = this.onIdentifier.bind(this,
                ast.name
            );
        } else if (ast.type == 'Literal' && this.options.allowLiterals ) {
            expFn = this.onLiteral.bind(this,
                ast.value,
                ast.raw
            );
        } else if (ast.type == 'CallExpression' && this.options.allowCallExpressions ) {
            let args = ast.arguments.reduce((c, v) => {
                c.push(this.buildAstFnTree(v));
                return c;
            }, []);

            expFn = this.onCallExpression.bind(this,
                this.buildAstFnTree(ast.callee),
                args
            );
        } else if (ast.type == "ArrayExpression" && this.options.allowArrayExpression) {
            let elements = ast.elements.reduce((c, v) => {
                c.push(this.buildAstFnTree(v));
                return c;
            }, []);
            expFn = this.onArrayExpression.bind(this, elements);
        } else {
            throw new Error(`Unhandled ast type: ${ast.type}`);
        }

        return expFn;
    }

    onArrayExpression(elements) {
        var elResolved = elements.reduce((c, v) => {
            let value = v();
            if (typeof value == 'string') {
                value = JSON.stringify(value);
            }
            c.push(value);
            return c;
        }, []);

        return elResolved.join(', ');
    }

    onLogicalExpression(op, left, right) {

        return `${left()} ${op} ${right()}`;
    }

    onBinaryExpression(op, left, right) {
        let rightValue = right();
        if ( typeof rightValue == 'string' ) {
            rightValue = JSON.stringify(rightValue);
        }
        return `${left()} ${op} ${rightValue}`;
    }

    onCallExpression(callee, args) {
        var argsResolved = args.reduce((c, v) => {
            let value = v();
            if ( typeof value == 'string' ) {
                value = JSON.stringify(value);
            }
            c.push(value);
            return c;
        }, []);
        return `${callee()}(${argsResolved.join(', ')})`;
    }

    onMemberExpression(computed, obj, property) {
        if (computed) {
            let objInst = obj();
            let comp = property();
            let objValue = objInst[comp];
            return objValue;
        } else {
            let objKey = obj();
            let objInst = this.state[objKey];
            let objValue = objInst[property()];
            return objValue;
        }
    }

    onIdentifier(name) {
        return name;
    }

    onLiteral(value, raw) {
        return value;
    }
}

var astTransforms = /*#__PURE__*/Object.freeze({
    AstTransform: AstTransform
});

class FrappeRestQueryAstTransform extends AstTransform {

    run(ast) {
        let result = super.run(ast);

        if ( typeof this.options.finalize == 'function' ) {
            return this.options.finalize(result);
        } else {
            if ( result.charAt(1) != '[' ) {
                result = `[${result}]`;
            }
            return result;
        }
    }

    onArrayExpression(elements) {
        var elResolved = elements.reduce((c, v) => {
            let value = v();
            c.push(value);
            return c;
        }, []);

        return elResolved.join(', ');
    }

    onLogicalExpression(op, left, right) {
        if ( op != '&&' ) {
            new new Error(`Unsupported operator: ${op}`);
        }
        return `[${left()}, ${right()}]`;
    }

    onBinaryExpression(op, left, right) {
        return `["${left()}", "${op}", ${right()}]`;
    }

    onCallExpression(callee, args) {
        let calleeName = callee().toLowerCase();
        if ( calleeName == 'like' ) {
            let field = args[0]();
            let match = args[1]();
            if ( typeof match == 'string' ) {
                match = JSON.stringify(match);
            }
            return `["${field}", "LIKE", ${match}]`;
        } else if ( calleeName == 'asc' ) {
            let field = args[0]();
            return `${field} ASC`;
        } else if (calleeName == 'desc') {
            let field = args[0]();
            return `${field} DESC`;
        }
    }

    onMemberExpression(computed, obj, property) {
        if (computed) {
            let objInst = obj();
            let comp = property();
            let objValue = objInst[comp];
            return objValue;
        } else {
            let objKey = obj();
            let objInst = this.state[objKey];
            let objValue = objInst[property()];
            return objValue;
        }
    }

}

/**
 * A generic model which wraps Frappe's REST api for their Doctypes.
 */
class FrappeDoctypeModel extends RestModel {

    constructor(options) {
        super(Object.assign({
        }, options));
    }

    getEndPoint(action, options, id, args, data) {
        let argStr = '';
        if (action == 'fetch') {
            let tmpArgs = [];
            for (var k in args) {
                if ( args[k] !== undefined ) {
                    tmpArgs.push(`${k}=${encodeURIComponent(args[k])}`);
                }
            }
            argStr = tmpArgs.join('&');
        }

        let ACTIONS = {
            connect: {
                url: `${options.baseUrl}/api/method/login?usr=${encodeURIComponent(options.auth.usr)}&pwd=${encodeURIComponent(options.auth.pwd)}`,
                method: 'get'
            },
            disconnect: {
                url: `${options.baseUrl}/api/method/logout`,
                method: 'get'
            },
            fetch: {
                url: `${options.baseUrl}/api/resource/${encodeURIComponent(options.resource)}${id ? '/' + id : ''}${argStr ? '?' + argStr : ''}`,
                method: 'get'
            },
            create: {
                url: `${options.baseUrl}/api/resource/${encodeURIComponent(options.resource)}`,
                method: 'post',
                data
            },
            update: {
                url: `${options.baseUrl}/api/resource/${encodeURIComponent(options.resource)}/${id}`,
                method: 'put',
                data
            },
            delete: {
                url: `${options.baseUrl}/api/resource/${encodeURIComponent(options.resource)}/${id}`,
                method: 'delete',
            },
            method: {
                url: `${options.baseUrl}/api/method/${id}`,
                method: 'get'
            },
            default: {
                url: `${options.baseUrl}`,
                method: 'get'
            }

        };

        return action in ACTIONS ? ACTIONS[action] : ACTIONS.default;
    }

    handleFrappeErrors(response, label) {
        let rx = /(?:\<pre\>)([^<]+)(?:\<\/pre\>)/ig;
        let matches = rx.exec(response.data);
        let remoteTrace = matches[1].trim().split("\n");
        let msg = remoteTrace[remoteTrace.length - 1];
        throw new RemoteError((this.options.name || 'Frappe') + (label?`[${label}]`:''), msg, remoteTrace);
    }

    async isConnected(data) {
        let endPoint = this.getEndPoint('method', this.options, 'frappe.auth.get_logged_user');
        return this.HTTP(endPoint).then(response => {
                if (response.status == 200) {
                    return data;
                } else {
                    throw new Error(response.status);
                }
            });
    }

    async fetch({where, orderby, start, limit}) {

        let filters,
            order_by,
            fields=JSON.stringify(this.fields),
            builder = new ExpressionBuilder({
                transform: new FrappeRestQueryAstTransform({
                    r: this.meta.fields
                })
            }),
            orderBuilder = new ExpressionBuilder({
                transform: new FrappeRestQueryAstTransform({
                    r: this.meta.fields
                }, {
                    allowArrayExpression: true,
                    allowLogicalOperators: false,
                    allowBinaryOperators: false,
                    finalize(output) {
                        return JSON.stringify(output);
                    }
                })
            });

        if ( where ) {
            filters = builder.parse(where).transform();
        }

        if ( orderby ) {
            order_by = orderBuilder.parse(orderby).transform();
        }

        let fetchArgs = {
            fields,
            filters,
            order_by,
            limit_start: start,
            limit_page_length: limit
        };
        let fetchEndPoint = this.getEndPoint('fetch', this.options, null, fetchArgs);

        let totalArgs = {
            fields: JSON.stringify(["count(*) as total"]),
            filters,
            order_by
        };
        let totalEndPoint = this.getEndPoint('fetch', this.options, null, totalArgs);
        return Promise.all([
            this.HTTP(fetchEndPoint),
            this.HTTP(totalEndPoint)])
            .then(responses => {
                let fetchResponse = responses[0],
                    totalResponse = responses[1],
                    result = {
                        rows: null,
                        total: 0
                    };

                // fetch results
                if (fetchResponse.status == 200) {
                    if (typeof fetchResponse.data != 'object') {
                        // something went wrong, needle could not parse returned json
                        throw new UnexpectedResponseError(this.name || "Frappe", fetchResponse.body, "Could not parse response from service");
                    }

                    result.rows = fetchResponse.data.data;
                } else {
                    this.handleFrappeErrors(fetchResponse, "Error while parsing fetch row results.");
                }

                // fetch query count
                if (totalResponse.status == 200) {
                    if (typeof totalResponse.data != 'object') {
                        // something went wrong, needle could not parse returned json
                        throw new UnexpectedResponseError(this.name || "Frappe", totalResponse.body, "Could not parse response from service");
                    }

                    result.total = totalResponse.data.data[0].total;
                } else {
                    this.handleFrappeErrors(totalResponse, "Error while parsing fetch total results.");
                }

                return result;
            });
    }

}

function createModel(options) {
    return new ModelProxy(options);
}

const transforms = {
    astTransforms,
    FrappeRestQueryAstTransform
};

export { createModel, ModelProxy, queryUtils, Schema, ModelBase, ArrayModel, RestModel, FrappeDoctypeModel, transforms, errors };
//# sourceMappingURL=bloom-orm.esm.js.map
