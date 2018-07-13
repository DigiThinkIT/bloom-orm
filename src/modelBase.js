export class ModelBase {
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