import { asc, desc, multiColSort } from '../queryUtils';
import { ModelBase } from '../modelBase';

export class ArrayModel extends ModelBase {
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