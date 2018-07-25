import { EventEmitter } from 'events';

/**
 * Base Model abstract class. All models should implement all methods on this class.
 * @extends EventEmitter
 */
export class ModelBase extends EventEmitter{
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