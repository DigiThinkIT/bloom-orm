// Import chai.
let chai = require('chai'),
    path = require('path'),
    expect = chai.expect;
chai.should();
chai.use(require('chai-string'));

let { queryUtils } = require(path.join(__dirname, '..', 'dist', 'bloom-orm.cjs'));
let { asc, desc } = queryUtils;

function modelProcess(result) {
    result.rows.forEach((row, i) => {
        row.description = `${row.id} : ${i}`;
        row.updated = true;
    })

    return result;
}

function eventTest(eventBase, rejectPromise, throwEventError, throwPromiseError) {
    let stats = {
        eventCalled: false,
        promiseResolved: false,
    }

    this.model.on(eventBase, e => {
        stats.eventCalled = true;

        expect(e.target).to.be.equal(this.model);
        expect(e.name).to.be.equal(eventBase);

        if ( throwEventError ) {
            throw throwEventError;
        }
        
        e.await(new Promise((resolve, reject) => {
            if ( throwPromiseError ) {
                throw throwPromiseError;
            }

            setTimeout(() => {
                if ( rejectPromise ) {
                    reject(rejectPromise);
                } else {
                    stats.promiseResolved = true;
                    resolve();
                }
            }, 1);
            return null;
        }))
    });

    return stats;
}

exports.shouldBehaveLikeAdapter = function() {
    describe('- Connect', function() {

        it('- connecting', function(done) {
            this.model
                .connect()
                .then(() => {
                    done();
                })
        });

        it('- events', function (done) {
            let beforeEvent = eventTest.bind(this)('beforeConnect');
            let afterEvent = eventTest.bind(this)('afterConnect');
            this.model
                .connect()
                .then(() => {
                    expect(beforeEvent.eventCalled).to.be.true
                    expect(beforeEvent.promiseResolved).to.be.true
                    expect(afterEvent.eventCalled).to.be.true
                    expect(afterEvent.promiseResolved).to.be.true
                    done();
                })
        });

        it('- fail before connect', function (done) {
            let beforeEvent = eventTest.bind(this)('beforeConnect', 'Reject me');
            let afterEvent = eventTest.bind(this)('afterConnect');
            this.model
                .connect()
                .then(() => {
                    expect(true, "Should never reach this code").to.be.false;
                    done();
                })
                .catch(err => {
                    expect(err).to.be.equal('Reject me');
                    expect(beforeEvent.eventCalled).to.be.true
                    expect(beforeEvent.promiseResolved).to.be.false
                    expect(afterEvent.eventCalled).to.be.false
                    expect(afterEvent.promiseResolved).to.be.false
                    done();
                })
        });

        it('- throw before connect', function (done) {
            let eventError = new Error("Event Error");
            let beforeEvent = eventTest.bind(this)('beforeConnect', false, eventError);
            let afterEvent = eventTest.bind(this)('afterConnect');
            this.model
                .connect()
                .then(() => {
                    expect(true, "Should never reach this code").to.be.false;
                    done();
                })
                .catch(err => {
                    expect(err).to.be.equal(eventError);
                    expect(beforeEvent.eventCalled).to.be.true
                    expect(beforeEvent.promiseResolved).to.be.false
                    expect(afterEvent.eventCalled).to.be.false
                    expect(afterEvent.promiseResolved).to.be.false
                    done();
                })
        });

        it('- throw in promise before connect', function (done) {
            let eventError = new Error("Event Error");
            let beforeEvent = eventTest.bind(this)('beforeConnect', false, false, eventError);
            let afterEvent = eventTest.bind(this)('afterConnect');
            this.model
                .connect()
                .then(() => {
                    expect(true, "Should never reach this code").to.be.false;
                    done();
                })
                .catch(err => {
                    expect(err).to.be.equal(eventError);
                    expect(beforeEvent.eventCalled).to.be.true
                    expect(beforeEvent.promiseResolved).to.be.false
                    expect(afterEvent.eventCalled).to.be.false
                    expect(afterEvent.promiseResolved).to.be.false
                    done();
                })
        });

        it('- fail after connect', function (done) {
            let beforeEvent = eventTest.bind(this)('beforeConnect');
            let afterEvent = eventTest.bind(this)('afterConnect', 'Reject me');
            this.model
                .connect()
                .then(() => {
                    expect(true, "Should never reach this code").to.be.false;
                    done();
                })
                .catch(err => {
                    expect(err).to.be.equal('Reject me');
                    expect(beforeEvent.eventCalled).to.be.true
                    expect(beforeEvent.promiseResolved).to.be.true
                    expect(afterEvent.eventCalled).to.be.true
                    expect(afterEvent.promiseResolved).to.be.false
                    done();
                })
        });

        it('- throw after connect', function (done) {
            let eventError = new Error("Event Error");
            let beforeEvent = eventTest.bind(this)('beforeConnect');
            let afterEvent = eventTest.bind(this)('afterConnect', false, eventError);
            this.model
                .connect()
                .then(() => {
                    expect(true, "Should never reach this code").to.be.false;
                    done();
                })
                .catch(err => {
                    expect(err).to.be.equal(eventError);
                    expect(beforeEvent.eventCalled).to.be.true
                    expect(beforeEvent.promiseResolved).to.be.true
                    expect(afterEvent.eventCalled).to.be.true
                    expect(afterEvent.promiseResolved).to.be.false
                    done();
                })
        });

        it('- throw in promise after connect', function (done) {
            let eventError = new Error("Event Error");
            let beforeEvent = eventTest.bind(this)('beforeConnect');
            let afterEvent = eventTest.bind(this)('afterConnect', false, false, eventError);
            this.model
                .connect()
                .then(() => {
                    expect(true, "Should never reach this code").to.be.false;
                    done();
                })
                .catch(err => {
                    expect(err).to.be.equal(eventError);
                    expect(beforeEvent.eventCalled).to.be.true
                    expect(beforeEvent.promiseResolved).to.be.true
                    expect(afterEvent.eventCalled).to.be.true
                    expect(afterEvent.promiseResolved).to.be.false
                    done();
                })
        });
    });

    describe("- Fetch", function() {

        it('- fetching', function (done) {
            this.model
                .fetch()
                .then(result => {
                    expect(result.rows, `Total Records 20`).to.be.an('array').that.has.lengthOf(20);
                    expect(result.rows, `Deep Test`).to.deep.equal(this.mockData.slice(0, 20));
                    done();
                })
        });

        it('- limit', function (done) {
            this.model
                .fetch({limit: 5})
                .then(result => {
                    expect(result.rows, `Total Records 5`).to.be.an('array').that.has.lengthOf(5);
                    expect(result.rows, `Deep Test`).to.deep.equal(this.mockData.slice(0, 5));
                    done();
                })
        });

        it('- start', function (done) {
            this.model
                .fetch({ start: 5 })
                .then(result => {
                    expect(result.rows, `Total Records 20`).to.be.an('array').that.has.lengthOf(20);
                    expect(result.rows, `Deep Test`).to.deep.equal(this.mockData.slice(5, 25));
                    done();
                })
        });

        it('- start + limit', function (done) {
            this.model
                .fetch({ start: 10, limit: 5 })
                .then(result => {
                    expect(result.rows, `Total Records 5`).to.be.an('array').that.has.lengthOf(5);
                    expect(result.rows, `Deep Test`).to.deep.equal(this.mockData.slice(10, 15));
                    done();
                })
        });

        it('- where', function (done) {
            this.model
                .fetch(r => r.id == 1)
                .then(result => {
                    expect(result.rows, `Total Records 1`).to.be.an('array').that.has.lengthOf(1);
                    expect(result.rows, `Deep Test`).to.deep.equal(this.mockData.slice(1, 2));
                })
                .then(() => this.model.fetch(r => r.id > 5 && r.id < 10))
                .then(result => {
                    expect(result.rows, `Total Records 4`).to.be.an('array').that.has.lengthOf(4);
                    expect(result.rows, `Deep Test`).to.deep.equal(this.mockData.slice(6, 10));
                })
                .then(() => this.model.fetch(r => r.id < 3))
                .then(result => {
                    expect(result.rows, `Total Records 3`).to.be.an('array').that.has.lengthOf(3);
                    expect(result.rows, `Deep Test`).to.deep.equal(this.mockData.slice(0, 3));
                })
                .then(() => {
                    done();
                });
        });

        it('- order by', function (done) {
            this.model
                .fetch({ orderby: r => asc(r.id) })
                .then(result => {
                    expect(result.rows, `Total Records 20`).to.be.an('array').that.has.lengthOf(20);
                    expect(result.rows, `Deep Test`).to.deep.equal(this.mockData.slice(0, 20));
                })
                .then(() => this.model.fetch({ orderby: r => desc(r.id) }))
                .then(result => {
                    expect(result.rows, `Total Records 20`).to.be.an('array').that.has.lengthOf(20);
                    expect(result.rows, `Deep Test`).to.deep.equal(this.mockData.sort((a, b) => b.id - a.id).slice(0, 20));
                })
                .then(() => {
                    done();
                });
        });

        it('- chained and update batch', function (done) {
            this.model
                .fetch({
                    where: r => (r.id > 5 && r.id < 50) || r.id == 1,
                    orderby: r => asc(r.value),
                    start: 0,
                    limit: 10
                })
                .then(result => this.model.update(modelProcess(result)))
                .then(result => {
                    result.rows.forEach((r, i) => {
                        expect(r.description, 'row description to start with id').to.startsWith(r.id.toString());
                        expect(r.updated, 'row updated to be true').to.be.valueOf(true);
                    });
                    expect(result.rows, 'rows to be on length 10').to.be.an('array').that.has.lengthOf(10);
                })
                .then(() => done());
        });

        it('- chained with start and limit', function (done) {

            this.model.fetch({ start: 0, limit: 5 })
                .then(result => {
                    expect(result.rows, 'rows to be an array of length 5').to.be.an('array').that.has.lengthOf(5);
                    expect(result.rows, 'rows should match data index from 0 to 5').to.deep.equal(this.mockData.slice(0, 5));
                    return result;
                })
                .then(() => this.model.fetch({ start: 5, limit: 10 }))
                .then(result => {
                    expect(result.rows, 'rows to be an array of length 10').to.be.an('array').that.has.lengthOf(10);
                    expect(result.rows, 'rows should match data index from 5 to 15').to.deep.equal(this.mockData.slice(5, 15));
                    return result;
                })
                .then(() => done());
        });
    });

    describe('- Delete', function() {
        it('- one', function (done) {
            this.model.fetch({ where: r => r.id == 5 })
                .then(result => {
                    expect(result.rows).to.be.an('array').that.has.lengthOf(1);
                    expect(result.rows).to.deep.equal([this.mockData[5]]);
                    return result;
                })
                .then(() => this.model.delete([5]))
                .then(() => this.model.fetch({ where: r => r.id == 5 }))
                .then(result => {
                    expect(result.rows).to.be.an('array').that.has.lengthOf(0);
                    expect(result.rows).to.deep.equal([]);
                    return result;
                })
                .then(() => done());
        });

        it('- many', function (done) {
            this.model.fetch({ where: r => r.id >= 1 && r.id <= 10 })
                .then(result => {
                    expect(result.rows).to.be.an('array').that.has.lengthOf(10);
                    expect(result.rows).to.deep.equal(this.mockData.slice(1, 11));
                    return result;
                })
                .then(() => this.model.delete([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))
                .then(() => this.model.fetch({ where: r => r.id >= 1 && r.id <= 10 }))
                .then(result => {
                    expect(result.rows).to.be.an('array').that.has.lengthOf(0);
                    expect(result.rows).to.deep.equal([]);
                    return result;
                })
                .then(() => done());
        });
    });

    describe('- Create', function() {
        it('- one', function (done) {
            this.model.create([{
                updated: false,
                description: 'I am new',
                value: 1000
            }])
                .then((result) => {
                    expect(result.rows).to.be.an('array').that.has.lengthOf(1);
                    expect(result.rows).to.deep.equal([{
                        updated: false,
                        description: 'I am new',
                        value: 1000,
                        id: this.mockData.length
                    }])
                }).then(() => this.model.fetch({ where: r => r.value == 1000 }))
                .then((result) => {
                    expect(result.rows).to.be.an('array').that.has.lengthOf(1);
                    expect(result.rows).to.deep.equal([{
                        updated: false,
                        description: 'I am new',
                        value: 1000,
                        id: this.mockData.length
                    }])
                })
                .then(() => done());
        });

        it('- many', function (done) {
            this.model.create([{
                    updated: false,
                    description: 'I am new 1',
                    value: 1000
                }, {
                    updated: false,
                    description: 'I am new 2',
                    value: 2000
                }, {
                    updated: false,
                    description: 'I am new 3',
                    value: 3000
                }])
                .then((result) => {
                    expect(result.rows).to.be.an('array').that.has.lengthOf(3);
                    expect(result.rows).to.deep.equal([{
                        updated: false,
                        description: 'I am new 1',
                        value: 1000,
                        id: this.mockData.length
                    }, {
                        updated: false,
                        description: 'I am new 2',
                        value: 2000,
                        id: this.mockData.length + 1
                    }, {
                        updated: false,
                        description: 'I am new 3',
                        value: 3000,
                        id: this.mockData.length + 2
                    }])
                }).then(() => this.model.fetch({ 
                    where: r => r.value >= 1000 && r.value <= 3000 ,
                    orderby: r => asc(r.value)
                }))
                .then((result) => {
                    expect(result.rows).to.be.an('array').that.has.lengthOf(3);
                    expect(result.rows).to.deep.equal([{
                        updated: false,
                        description: 'I am new 1',
                        value: 1000,
                        id: this.mockData.length
                    }, {
                        updated: false,
                        description: 'I am new 2',
                        value: 2000,
                        id: this.mockData.length + 1
                    }, {
                        updated: false,
                        description: 'I am new 3',
                        value: 3000,
                        id: this.mockData.length + 2
                    }])
                })
                .then(() => done());
        });
    });
}