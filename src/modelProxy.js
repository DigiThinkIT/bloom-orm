import { isArrowFunction } from './queryUtils';
import { ModelBase } from './modelBase';

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
export class AsyncEvent {

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
export class ModelProxy extends ModelBase {

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
            })

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
            })


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
            .then(data => new AsyncEvent('afterUpdate', this, data).wait(data))

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
            })

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
            })


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