import RestModel from './rest';
import { ExpressionBuilder } from '../expressions';
import FrappeRestQueryAstTransform from '../astTransforms/frappe';
import { RemoteError, UnexpectedResponseError } from '../errors';

/**
 * A generic model which wraps Frappe's REST api for their Doctypes.
 */
export default class FrappeDoctypeModel extends RestModel {

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

        }

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

                    result.total = totalResponse.data.data[0].total
                } else {
                    this.handleFrappeErrors(totalResponse, "Error while parsing fetch total results.");
                }

                return result;
            });
    }

}