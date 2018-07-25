import { asc, desc, multiColSort } from '../queryUtils';
import { ModelBase } from '../modelBase';

/**
 * Reference model implementation based on simple object arrays
 * @extends ModelBase
 */
export default class ArrayModel extends ModelBase {
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
            }

            if (start === undefined) { start = 0 }
            if (limit === undefined) { limit = 20 }

            let count = 0;
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
            }

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
                })

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
            })

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