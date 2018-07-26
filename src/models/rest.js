import { asc, desc, multiColSort } from '../queryUtils';
import { ModelBase } from '../modelBase';
import { Schema } from '../schema';
import { RemoteError } from '../errors';
import { leftPadLines, normalizeField, capitalize } from '../utils';
const axios = require('axios');

/**
 * A generic and extensible Rest model.
 * @extends ModelBase
 */
export class RestModel extends ModelBase {
    constructor(options) {
        super(options);

        this._connected = false;
        this.cookies = {};
        this.fields = [];
        this.meta = {
            fields: {
                $id: this.options.primary_key
            }
        }

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
        }

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
            connectPromise = this.options.connect(endPoint, this.options, this.HTTP.bind(this))
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
            disconnectPromise = this.options.disconnect(endPoint, this.options, this.HTTP.bind(this))
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

            let result = {
                rows: [],
                total: 100
            }

            if (start === undefined) { start = 0 }
            if (limit === undefined) { limit = 20 }

            
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

export default RestModel;