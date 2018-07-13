// Import chai.
let chai = require('chai'),
    path = require('path'),
    expect = chai.expect;

let { queryUtils } = require(path.join(__dirname, '..', 'dist', 'freak-orm.umd'));
let { asc, desc } = queryUtils;
let { isArrowFunction } = queryUtils;

chai.use(require('chai-string'));

describe('Query Utilities', function() {

    describe('- isArrowFunction -', function() {
        it('Test no arg arrow function', function() {
            expect(isArrowFunction(() => 1)).to.be.true;
        })

        it('Test one arg v1 arrow function', function () {
            expect(isArrowFunction(x => x)).to.be.true;
        })

        it('Test one arg v2 arrow function', function () {
            expect(isArrowFunction((x) => x)).to.be.true;
        })

        it('Test multiple args arrow function', function () {
            expect(isArrowFunction((a, b, c, d) => a + b + c+ d)).to.be.true;
        })

        it('Test single ...arg arrow function', function () {
            expect(isArrowFunction((...rest) => rest )).to.be.true;
        })

        it('Test deconstructor args arrow function', function () {
            expect(isArrowFunction(({a, b, c, d}) => a + b + c + d)).to.be.true;
        })

        it('Test default args arrow function', function () {
            expect(isArrowFunction((a=1,b=2,c=3,d=4) => a + b + c + d)).to.be.true;
        })

        it('Test no args, with body', function () {
            expect(isArrowFunction(() => { 1 })).to.be.true;
        })

        it('Test object composition, with obj body', function () {
            expect(isArrowFunction((a, b) => { a, b })).to.be.true;
        })

        it('Test regular function fail', function () {
            expect(isArrowFunction(function() { return 'I should fail'})).to.be.false;
        })
    });

    describe('- sorting -', function() {
        it('Assending', function() {
            expect(typeof asc('id')).to.be.equal("function");
            expect(asc('id')({id: 1}, {id: 2})).to.be.equal(-1);
        })

        it('Descending', function () {
            expect(typeof desc('id')).to.be.equal("function");
            expect(desc('id')({ id: 1 }, { id: 2 })).to.be.equal(1);
        })
    })
});