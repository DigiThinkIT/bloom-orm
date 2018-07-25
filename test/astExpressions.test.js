require('source-map-support').install();
// Import chai.
let chai = require('chai'),
    path = require('path'),
    sinon = require('sinon'),
    jsep = require('jsep'),
    expect = chai.expect;

chai.should();
chai.use(require('chai-string'));

let { transforms } = require(path.join(__dirname, '..', 'dist', 'bloom-orm.cjs'));
let { astTransforms, FrappeRestQueryAstTransform } = transforms;

describe("AST Transforms", function () {
    it("onLogicalExpression", function () {
        let t = new astTransforms.AstTransform();
        let left = () => 'left';
        let right = () => 'right';
        let result = t.onLogicalExpression('op', left, right);
        expect(result).to.be.equal('left op right');
    });

    it("onBinaryExpression", function () {
        let t = new astTransforms.AstTransform();
        let left = () => 'left';
        let right = () => 'right';
        let result = t.onBinaryExpression('op', left, right);
        expect(result).to.be.equal('left op "right"');
    });

    it("onCallExpression", function () {
        let t = new astTransforms.AstTransform();
        let callee = () => 'like';
        let args = [
            t.buildAstFnTree({
                type: 'Identifier',
                name: 'x'
            }), t.buildAstFnTree({
                type: 'Literal',
                value: 'a%',
                raw: '"a%"'
            })
        ];
        let result = t.onCallExpression(callee, args);
        expect(result).to.be.equal('like("x", "a%")');
    });

    it("onMemberExpression", function () {
        let t = new astTransforms.AstTransform();
        t.state = {
            r: {
                x: 'fieldX'
            }
        }
        let obj = t.buildAstFnTree({
            type: "Identifier",
            name: "r"
        });
        let prop = t.buildAstFnTree({
            type: "Identifier",
            name: 'x'
        })
        let result = t.onMemberExpression(false, obj, prop);
        expect(result).to.be.equal('fieldX');
    });

    it("onMemberExpression computed", function () {
        let t = new astTransforms.AstTransform();
        t.state = {
            r: {
                x: 'fieldX'
            }
        }
        let obj = t.buildAstFnTree({
            type: "MemberExpression",
            computed: false,
            object: {
                type: "Identifier",
                name: "r"
            },
            property: {
                type: "Identifier",
                name: 'x'
            }
        })
        let prop = t.buildAstFnTree({
            type: "Literal",
            value: '0',
            raw: 0
        })
        let result = t.onMemberExpression(true, obj, prop);
        expect(result).to.be.equal('f');
    });

    it("onIdentifier", function () {
        let t = new astTransforms.AstTransform();
        let result = t.onIdentifier('x');
        expect(result).to.be.equal('x');
    });

    it("onLiteral", function () {
        let t = new astTransforms.AstTransform();
        let result = t.onLiteral(1, 1);
        expect(result).to.be.equal(1);
    });
});

describe("Frappe Query AST Transforms", function () {

    it("orderby simulate", function() {
        let t = new FrappeRestQueryAstTransform({
            r: { id: 'id', name: 'name' }
        }, {
            allowArrayExpression: true,
            allowLogicalOperators: false,
            allowBinaryOperators: false,
            finalize(output) {
                return JSON.stringify(output);
            }            
        });
        let ast = jsep("[asc(r.id), desc(r.name)]");
        let result = t.run(ast);
        expect(result).to.be.equal('"id ASC, name DESC"');
    })

    it("onLogicalExpression", function () {
        let t = new FrappeRestQueryAstTransform();
        let left = () => '[left]';
        let right = () => '[right]';
        let result = t.onLogicalExpression('&&', left, right);
        expect(result).to.be.equal('[[left], [right]]');
    });

    it("onBinaryExpression", function () {
        let t = new FrappeRestQueryAstTransform();
        let left = () => 'left';
        let right = () => 'right';
        let result = t.onBinaryExpression('op', left, right);
        expect(result).to.be.equal('["left", "op", right]');
    });

    it("onCallExpression", function () {
        let t = new FrappeRestQueryAstTransform();
        let callee = () => 'like';
        let args = [
            t.buildAstFnTree({
                type: 'Identifier',
                name: 'x'
            }), t.buildAstFnTree({
                type: 'Literal',
                value: 'a%',
                raw: '"a%"'
            })
        ];
        let result = t.onCallExpression(callee, args);
        expect(result).to.be.equal('["x", "LIKE", "a%"]');
    });

    it("onMemberExpression", function () {
        let t = new FrappeRestQueryAstTransform();
        t.state = {
            r: {
                x: 'fieldX'
            }
        }
        let obj = t.buildAstFnTree({
            type: "Identifier",
            name: "r"
        });
        let prop = t.buildAstFnTree({
            type: "Identifier",
            name: 'x'
        })
        let result = t.onMemberExpression(false, obj, prop);
        expect(result).to.be.equal('fieldX');
    });

    it("onMemberExpression computed", function () {
        let t = new FrappeRestQueryAstTransform();
        t.state = {
            r: {
                x: 'fieldX'
            }
        }
        let obj = t.buildAstFnTree({
            type: "MemberExpression",
            computed: false,
            object: {
                type: "Identifier",
                name: "r"
            },
            property: {
                type: "Identifier",
                name: 'x'
            }
        })
        let prop = t.buildAstFnTree({
            type: "Literal",
            value: '0',
            raw: 0
        })
        let result = t.onMemberExpression(true, obj, prop);
        expect(result).to.be.equal('f');
    });

    it("onIdentifier", function () {
        let t = new FrappeRestQueryAstTransform();
        let result = t.onIdentifier('x');
        expect(result).to.be.equal('x');
    });

    it("onLiteral", function () {
        let t = new FrappeRestQueryAstTransform();
        let result = t.onLiteral(1, 1);
        expect(result).to.be.equal(1);
    });
});