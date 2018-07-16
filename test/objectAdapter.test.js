require('source-map-support').install();
// Import chai.
let chai = require('chai'),
    path = require('path');

let { createModel, asc, desc, ArrayModel } = require(path.join(__dirname, '..', 'dist', 'bloom-orm.cjs'));
let sharedAdapterTests = require('./model.interface');

// Tell chai that we'll be using the "should" style assertions.
chai.should();
chai.use(require('chai-string'));

let mockData = [];
for (let i = 0; i < 100; i++) {
    mockData.push({
        updated: false,
        description: "",
        value: i % 10,
        id: i
    });
}

describe("Local Array Model", function () {
    beforeEach(function() {
        // expose Array Model through context
        this.model = createModel({
            model: ArrayModel,
            data: mockData.slice()
        });

        // expose mock data through context
        this.mockData = mockData.slice();
    });

    // use context to share test behaviours
    sharedAdapterTests.shouldBehaveLikeAdapter();
});
