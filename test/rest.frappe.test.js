require('source-map-support').install();
// Import chai.
let chai = require('chai'),
    path = require('path'),
    sinon = require('sinon'),
    expect = chai.expect,
    { PromiseFinally, MockRestAdapter } = require('./utils');

let { createModel, queryUtils, FrappeDoctypeModel, transforms } = require(path.join(__dirname, '..', 'dist', 'bloom-orm.cjs'));
let { astTransforms, FrappeRestQueryAstTransform} = transforms;
let sharedModelTests = require('./model.interface');
let { asc, desc } = queryUtils;

// Tell chai that we'll be using the "should" style assertions.
chai.should();
chai.use(require('chai-string'));

let mockData = [];
for (let i = 0; i < 100; i++) {
    mockData.push({
        updated: false,
        description: "",
        value: i % 10,
        id: i,
        name: i.toString()
    });
}

describe("Frappe Rest API Model", function () {

    beforeEach(function () {
        this.mockRest = new MockRestAdapter();
        this.model = createModel({
            model: FrappeDoctypeModel,
            autoDisconnect: true,
            resource: 'MockObject',
            primary_key: 'name',
            schema: {
                id: "/frappe/doctype/MockObject",
                type: "object",
                properties: {
                    udpated: { type: 'boolean' },
                    description: { type: 'string' },
                    value: { type: 'int' },
                    id: { type: 'int' },
                    name: { type: 'string' }
                }
            },
            debug: false,
            baseUrl: 'http://testserver',
            auth: {
                'usr': 'TESTER',
                'pwd': 'my password'
            },
            http: this.mockRest
        })

        // expose mock data to tests
        this.mockData = mockData.slice();
        this.serverkData = mockData.slice();

        this.mockRest.onRequest('get', /api\/method\/login\/?/i, {
            status: 200,
            response: { data: { "home_page": " / desk", "message": "Logged In", "full_name": "TESTER" } }
        })

        this.mockRest.onRequest('get', /api\/method\/logout\/?/i, {
            status: 200,
            response: { data: {} }
        })

        this.mockRest.onRequest('get', /api\/method\/frappe.auth.get_logged_user\/?/i, {
            status: 200,
            response: { data: "TESTER" }
        })

        this.mockRest.onRequest('delete', /api\/resource\/MockObject\/(.*)\/?/i, (req) => {
            let id = parseInt(req.request.urlMatches[1]);
            let idx = this.serverkData.findIndex(r => r.id == id);
            if ( idx > -1 ) {
                this.serverkData.splice(idx, 1);

                return {
                    status: 200,
                    response: { message: 'ok' }
                }
            } else {
                return {
                    status: 404,
                    response: { message: 'Record Not Found' }
                }
            }
        });

        this.mockRest.onRequest('put', /api\/resource\/MockObject\/(.*)\/?/i, (req) => {

            let idx = this.serverkData.findIndex(r => r.id == req.data.id );
            this.serverkData[idx] = req.data;

            return {
                status: 200,
                response: { data: req.data }
            }
        });

        this.mockRest.onRequest('post', /api\/resource\/MockObject\/?/i, (req) => {
            let row = req.data;
            let lastId = this.serverkData[this.serverkData.length - 1].id;

            row.id = ++lastId;
            this.serverkData.push(row);

            return {
                status: 200,
                response: { data: row }
            }
        });

        this.mockRest.onRequest('get', /api\/resource\/MockObject\/?/i, (req) => {
            let limit_start = parseInt(req.request.query.limit_start);
            let limit_page_length = parseInt(req.request.query.limit_page_length);

            if ( limit_start === undefined ) {
                limit_start = 0;
            }

            if ( limit_page_length === undefined ) {
                limit_page_length = 20;
            }

            let results = this.serverkData.slice();

            if ( req.request.query.order_by == '"id DESC"') {
                results = results.sort(desc('id'));
            }

            if (req.request.query.order_by == '"id ASC"') {
                results = results.sort(asc('id'));
            }

            if (req.request.query.order_by == '"value ASC"') {
                results = results.sort(asc('value'));
            }

            if (req.request.query.filters == '[["value", "==", 1000]]') {
                results = results.reduce((c, row) => {
                    if (row.value == 1000) {
                        c.push(row);
                    }
                    return c;
                }, []);;
            }

            if (req.request.query.filters == '[["value", ">=", 1000], ["value", "<=", 3000]]') {
                results = results.reduce((c, row) => {
                    if (row.value >= 1000 && row.value <= 3000) {
                        c.push(row);
                    }
                    return c;
                }, []);;
            }

            if ( req.request.query.filters == '[["id", "==", 1]]') {
                results = results.reduce((c, row) => {
                        if ( row.id == 1 ) {
                            c.push(row);
                        }
                        return c;
                    }, []);;
            }

            if (req.request.query.filters == '[["id", "<", 3]]') {
                results = results.reduce((c, row) => {
                    if (row.id < 3) {
                        c.push(row);
                    }
                    return c;
                }, []);;
            }

            if (req.request.query.filters == '[["id", ">=", 1], ["id", "<=", 10]]') {
                results = results.reduce((c, row) => {
                    if (row.id >= 1 && row.id <= 10) {
                        c.push(row);
                    }
                    return c;
                }, []);;
            }

            if (req.request.query.filters == '[["id", "==", 5]]') {
                results = results.reduce((c, row) => {
                    if (row.id == 5) {
                        c.push(row);
                    }
                    return c;
                }, []);;
            }

            if (req.request.query.filters == '[["id", ">", 5], ["id", "<", 10]]') {
                results = results.reduce((c, row) => {
                    if (row.id > 5 && row.id < 10) {
                        c.push(row);
                    }
                    return c;
                }, []);;
            }

            results = results.slice(limit_start, limit_start + limit_page_length);
            
            if (req.request.query.fields == '["count(*) as total"]') {
                return { 
                    status: 200,
                    response: { data: [ { total: results.length } ]  } 
                };
            }

            return {
                status: 200,
                response: { data: results }
            };
        });

        this.mockRest.start();
    });

    afterEach(function(done) {
        this.mockRest.stop().then(r => done());
    });

    sharedModelTests.shouldBehaveLikeModel();

    // Better way to test execution instead of allowing processing
    // TODO: Simplify test to use sinon.spy

    it("- Connect", function(done) {
        let onConnect = sinon.spy();
        let p = this.model.connect();
        p.then(onConnect);

        this.mockRest.wait(1).then(() => {
            expect(onConnect.called).to.be.true;
            done();
        });
    })

    it("- Fetch", function(done) {

        let onFetch = sinon.spy();

        let p = this.model.fetch({
            where: r => r.value < 10,
            limit: 15
        });

        p.then(onFetch);
        
        // wait for 4 requests: login, fetch, fetch count, logout
        this.mockRest.wait(4).then(() => {
            expect(onFetch.called).to.be.true;
            done();
        })
    })
});