'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var events = require('events');

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

class Schema {
    constructor(options) {
        this.options = options;
    }

    validate(field, value) {

    }
}

/**
 * Base Model abstract class. All models should implement all methods on this class.
 * @extends EventEmitter
 */
class ModelBase extends events.EventEmitter{
    /**
     * 
     * @param {*} options
     */
    constructor(options) {
        super();
        this.options = options;
    }

    /**
     * @returns true if connected.
     */
    get isConnected() {
        return false;
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
     * @returns {boolean} true when connected
     * @override
     */
    get isConnected() {
        return this._connected;
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
                let row = Object.assign({}, this._data[i]);

                let matchCondition = where ? where(row) : true;
                if (matchCondition) {
                    result.rows.push(row);
                }
            }

            let rowFields = {
                id: 'id',
                value: 'value',
                description: 'description',
                updated: 'updated'
            };

            if (orderby) {
                result.rows = result.rows.sort(multiColSort(orderby(rowFields, asc, desc)));
            }

            result.rows = result.rows.slice(start, start + limit);

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
    async create(rows) {
        return new Promise(success => {
            let lastId = this._data[this._data.length - 1].id;
            rows.forEach((row, i) => {
                row.id = ++lastId;
                this._data.push(row);
            });

            success({ rows });
        });
    }

}

/**
 * A convenient event argument container that allows async processing for subscribing events.
 * @example
 * // simple event
 * let EventEmitter = require('event');
 * let emitter = new EventEmitter();
 * let e = new EventArgs('myevent', emitter, { a: 1});
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
class EventArgs {

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
class ModelFacade extends ModelBase {

    /**
     * 
     * @param {*} options Model configuration
     * @param {string} options.adapter Adapter to load or instantiate.
     */
    constructor(options) {
        super(options);

        this.options = Object.assign({
        }, options);

        if (typeof options.model == 'string') {
            this._model = new require(options.model)(options);
        } else {
            this._model = new options.model(options);
        }
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
         * @event ModelFacade#beforeConnect
         * @type {EventArgs}
         */
        let beforeConnectEvent = new EventArgs('beforeConnect', this, {});

        /**
         * After connecting
         * @event ModelFacade#afterConnect
         * @type {EventArgs}
         */

        return beforeConnectEvent.wait(data)
            .then(data => this._model.connect(data))
            .then(data => new EventArgs('afterConnect', this, {}).wait(data))
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
         * @event ModelFacade#beforeDisconnect
         * @type {EventArgs}
         */
        let beforeDisconnectEvent = new EventArgs('beforeDisconnect', this, {});

        /**
         * After disconnecting
         * @event ModelFacade#aftereDisconnect
         * @type {EventArgs}
         */

        return beforeDisconnectEvent.wait(data)
            .then(data => this._model.disconnect(data))
            .then(data => new EventArgs('afterDisconnect', this, {}).wait(data))
    }

    /**
     * Data fetch method. Accepts either a 'where' arrow function or more complex
     * object containing where, orderby, start, limit options.
     * @param {*} query 
     * @fires beforeFetch Before disconnecting event.
     * @fires afterFetch After disconnecting event.
     * @returns {Promise}
     */
    async fetch(query={}) {

        /** Accept an arrow function as 'where' condition */
        if (isArrowFunction(query)) {
            query = { where: query };
        }

        let chain = Promise.resolve(query);
        if (!this._model.isConnected) {
            chain = chain.then(query => this.connect(query));
        }

        /**
         * Before fetch
         * @event ModelFacade#beforeFetch
         * @property {object} query Query object containing, where, orderby, start and limit properties.
         * @property {function} query.where A where arrow function definition.
         * @property {function} query.orderby A record order by definition arrow function.
         * @property {int} query.start The record start index, used in pagination mostly.
         * @property {int} query.limit The maximum number of records to return.
         * @type {EventArgs}
         */
        let beforeFetchEvent = new EventArgs('beforeFetch', this, { query });

        /**
         * After fetch
         * @event ModelFacade#afterFetch
         * @property {object} result A query result object containing records fetched.
         * @property {Array} result.rows Records fetched.
         * @type {EventArgs}
         */

        chain = chain.then(query => beforeFetchEvent.wait(query))
            .then(query => this._model.fetch(query))
            .then(result => new EventArgs('afterFetch', this, { result }).wait(result));

        if (this.options.autoDisconnect) {
            chain = chain.then(this.disconnect);
        }

        return chain;
    }

    /**
     * Updates an array of data
     * @param {Array} rows
     * @fires beforeUpdate Before disconnecting event.
     * @fires afterUpdate After disconnecting event.
     * @returns {Promise}
     */
    async update(rows) {
        let chain = Promise.resolve(rows);
        if (!this._model.isConnected) {
            chain = chain.then(rows => this.connect(rows));
        }

        /**
         * Before update
         * @event ModelFacade#beforeUpdate
         * @property { Array } rows Array of records to update.
         * @type {EventArgs}
         */
        let beforeUpdateEvent = new EventArgs('beforeUpdate', this, { rows });

        /**
         * After update
         * @event ModelFacade#afterUpdate
         * @property { Array } rows Array of updated records.
         * @type {EventArgs}
         */

        chain = chain.then(rows => beforeUpdateEvent.wait(rows))
            .then(rows => this._model.update(rows))
            .then(rows => new EventArgs('afterUpdate', this, { rows }).wait(rows));

        if (this.options.autoDisconnect) {
            chain = chain.then(result => this.disconnect(result));
        }

        return chain;
    }

    /**
     * Creates a list of records.
     * @param {Array} rows 
     * @fires beforeCreate Before disconnecting event.
     * @fires afterCreate After disconnecting event.
     * @returns {Promise} List of records created.
     */
    async create(rows) {
        let chain = Promise.resolve(rows);
        if (!this._model.isConnected) {
            chain = chain.then(rows => this.connect(rows));
        }

        /**
         * Before create
         * @event ModelFacade#beforeCreate
         * @property {Array} rows Array of records to create.
         * @type {EventArgs}
         */
        let beforeCreateEvent = new EventArgs('beforeCreate', this, { rows });

        /**
         * After create
         * @event ModelFacade#aftereCreate
         * @property {Array} rows Array of created records.
         * @type {EventArgs}
         */

        chain = chain.then(rows => beforeCreateEvent.wait(rows))
            .then(rows => this._model.create(rows))
            .then(rows => new EventArgs('afterCreate', this, { rows }).wait(rows));

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
     * @returns {Promise}
     */
    async delete(ids) {
        let chain = Promise.resolve(ids);

        if (!this._model.isConnected) {
            chain = chain.then(ids => this._model.connect(ids));
        }

        /**
         * Before delete
         * @event ModelFacade#beforeDelete
         * @property {Array} ids The record ids to delete.
         * @type {EventArgs}
         */
        let beforeDeleteEvent = new EventArgs('beforeDelete', this, { ids });

        /**
         * After delete
         * @event ModelFacade#aftereDelete
         * @property {Array} ids The record ids deleted.
         * @type {EventArgs}
         */

        chain = chain.then(ids => beforeDeleteEvent.wait(ids))
            .then(ids => this._model.delete(ids))
            .then(ids => new EventArgs('afterDelete', this, { ids }).wait(ids));

        if (this.options.autoDisconnect) {
            chain = chain.then(result => this.disconnect(result));
        }

        return chain;
    }
}

function createModel(options) {
    return new ModelFacade(options);
}

exports.createModel = createModel;
exports.ModelFacade = ModelFacade;
exports.queryUtils = queryUtils;
exports.Schema = Schema;
exports.ModelBase = ModelBase;
exports.ArrayModel = ArrayModel;
//# sourceMappingURL=freak-orm.cjs.js.map
