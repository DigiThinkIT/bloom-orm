import { isArrowFunction } from './queryUtils';
import { EventEmitter } from 'events';

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
export class EventArgs {
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
export class ModelFacade extends EventEmitter {

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
            chain = chain.then(query => this.connect(query))
        }

        chain = chain.then(query => this._model.fetch(query))
        if (this.options.autoDisconnect) {
            chain = chain.then(this.disconnect);
        }

        return chain;
    }

    async update(rows) {
        let chain = Promise.resolve(rows);
        if (!this._model.isConnected) {
            chain = chain.then(rows => this.connect(rows))
        }

        chain = chain.then(rows => this._model.update(rows))
        if (this.options.autoDisconnect) {
            chain = chain.then(result => this.disconnect(result));
        }

        return chain;
    }

    async create(rows) {
        let chain = Promise.resolve(rows);
        if (!this._model.isConnected) {
            chain = chain.then(rows => this.connect(rows))
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
            chain = chain.then(ids => this._model.connect(ids))
        }

        chain = chain.then(ids => this._model.delete(ids));
        if (this.options.autoDisconnect) {
            chain = chain.then(result => this.disconnect(result));
        }

        return chain;
    }
}