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

class Schema {
    constructor(options) {
        this.options = options;
    }

    validate(field, value) {

    }
}

class ModelBase {
    constructor(model) {
        this.model = model;
    }

    get isConnected() {
        return false;
    }

    connect(data) {
        return this.model.Promise.resolve(data);
    }

    disconnect(data) {
        return this.model.Promise.resolve(data);
    }

    fetch(query) {
        return this.model.Promise.resolve({ rows: [], total: 0 });
    }

    update(rows) {
        return this.model.Promise.resolve({ rows: [] });
    }

    create(rows) {
        return this.model.Promise.resolve({ rows: [] });
    }

    delete(rows) {
        return this.model.Promise.resolve({ rows: [] });
    }

}

class ArrayModel extends ModelBase {
    constructor(model) {
        super(model);
        this._data = this.model.options.data;
        this._connected = false;
    }

    get isConnected() {
        return this._connected;
    }

    async connect(data) {
        return new Promise(resolve => {
            this._connected = true;
            return resolve(data)
        });
    }

    async disconnect(data) {
        return new Promise(resolve => {
            this._connected = false;
            return resolve(data)
        });
    }

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
 */
class ModelFacade extends EventEmitter {

    /**
     * 
     * @param {*} options Model configuration
     * @param {string} options.adapter Adapter to load
     */
    constructor(options) {
        super();

        this.options = Object.assign({
            Promise
        }, options);

        if (typeof options.model == 'string') {
            this._model = new require(options.model)(this);
        } else {
            this._model = new options.model(this);
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
         * @event beforeConnect
         * @type {EventArgs}
         */
        let beforeConnectEvent = new EventArgs('beforeConnect', this, {});
        /**
         * After connecting
         * @event afterConnect
         * @type {EventArgs}
         */
        let afterConnectEvent = new EventArgs('afterConnect', this, {});

        return beforeConnectEvent.wait(data)
            .then(data => this._model.connect(data))
            .then(data => afterConnectEvent.wait(data))
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
         * @event beforeDisconnect
         * @type {EventArgs}
         */
        let beforeDisconnectEvent = new EventArgs('beforeDisconnect', this, {});
        /**
         * After disconnecting
         * @event aftereDisconnect
         * @type {EventArgs}
         */
        let afterDisconnectEvent = new EventArgs('afterDisconnect', this, {});

        return beforeDisconnectEvent.wait(data)
            .then(data => this._model.disconnect(data))
            .then(data => afterDisconnectEvent.wait(data))
    }

    /**
     * 
     * @param {*} query 
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

        chain = chain.then(query => this._model.fetch(query));
        if (this.options.autoDisconnect) {
            chain = chain.then(this.disconnect);
        }

        return chain;
    }

    async update(rows) {
        let chain = Promise.resolve(rows);
        if (!this._model.isConnected) {
            chain = chain.then(rows => this.connect(rows));
        }

        chain = chain.then(rows => this._model.update(rows));
        if (this.options.autoDisconnect) {
            chain = chain.then(result => this.disconnect(result));
        }

        return chain;
    }

    async create(rows) {
        let chain = Promise.resolve(rows);
        if (!this._model.isConnected) {
            chain = chain.then(rows => this.connect(rows));
        }

        chain = chain.then(rows => this._model.create(rows));
        if (this.options.autoDisconnect) {
            chain = chain.then(result => this.disconnect(result));
        }

        return chain;
    }

    async delete(ids) {
        let chain = Promise.resolve(ids);

        if (!this._model.isConnected) {
            chain = chain.then(ids => this._model.connect(ids));
        }

        chain = chain.then(ids => this._model.delete(ids));
        if (this.options.autoDisconnect) {
            chain = chain.then(result => this.disconnect(result));
        }

        return chain;
    }
}

function createModel(options) {
    return new ModelFacade(options);
}

export { createModel, ModelFacade, queryUtils, Schema, ModelBase, ArrayModel };
//# sourceMappingURL=freak-orm.esm.js.map
