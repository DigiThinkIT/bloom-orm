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
let { astTransforms, FrappeRestQueryAstTransform, MySQLAstTransform } = transforms;
let { AstValue } = astTransforms;

describe("AST Transforms", function () {
    it("onLogicalExpression", function () {
        let t = new astTransforms.AstTransform();
        let left = AstValue('left', null, t.options.formatter);
        let right = AstValue('right', null, t.options.formatter);
        let result = t.onLogicalExpression('op', left, right);
        expect(result.format()).to.be.equal('"left" op "right"');
    });

    it("onBinaryExpression", function () {
        let t = new astTransforms.AstTransform();
        let left = AstValue('left', null, t.options.formatter);
        let right = AstValue('right', null, t.options.formatter);
        let result = t.onBinaryExpression('op', left, right);
        expect(result.format()).to.be.equal('"left" op "right"');
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
        expect(result.format()).to.be.equal('like(x, "a%")');
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
        expect(result.format()).to.be.equal('fieldX');
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
            value: 0,
            raw: 0
        })
        let result = t.onMemberExpression(true, obj, prop);
        expect(result.format()).to.be.equal('"f"');
    });

    it("onIdentifier", function () {
        let t = new astTransforms.AstTransform();
        let result = t.onIdentifier('x');
        expect(result.format()).to.be.equal('x');
    });

    it("onLiteral", function () {
        let t = new astTransforms.AstTransform();
        let result = t.onLiteral(1, 1);
        expect(result.format()).to.be.equal(1);
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
        let left = AstValue('[left]', 'identifier', t.options.formatter);
        let right = AstValue('[right]', 'identifier', t.options.formatter);
        let result = t.onLogicalExpression('&&', left, right);
        expect(result.format()).to.be.equal('[[left], [right]]');
    });

    it("onBinaryExpression", function () {
        let t = new FrappeRestQueryAstTransform();
        let left = AstValue('left', null, t.options.formatter);
        let right = AstValue('right', null, t.options.formatter);
        let result = t.onBinaryExpression('op', left, right);
        expect(result.format()).to.be.equal('["left", "op", "right"]');
    });

    it("onBinaryExpression real", function () {
        let t = new FrappeRestQueryAstTransform();
        let ast = jsep('"field" == "a string"');
        let result = t.run(ast);
        expect(result).to.be.equal('[["field", "=", "a string"]]');
    });

    it("onBinaryExpression real field", function () {
        let t = new FrappeRestQueryAstTransform({
            r: {
                field: 'my_field'
            }
        });
        let ast = jsep('r.field == "a string"');
        let result = t.run(ast);
        expect(result).to.be.equal('[["my_field", "=", "a string"]]');
    });

    it("onCallExpression", function () {
        let t = new FrappeRestQueryAstTransform();
        let callee = AstValue('like', 'indentifier', t.options.formatter);
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
        expect(result.format()).to.be.equal('[x, "LIKE", "a%"]');
    });

    it("onCallExpression real", function () {
        let t = new FrappeRestQueryAstTransform({
            r: {
                field: 'my_field'
            }
        });
        let ast = jsep('like(r.field, "a string")');
        let result = t.run(ast);
        expect(result).to.be.equal('[["my_field", "LIKE", "a string"]]');

    });

    it("onMemberExpression row", function () {
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
        expect(result.format()).to.be.equal('"fieldX"');
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
            value: 0,
            raw: 0
        })
        let result = t.onMemberExpression(true, obj, prop);
        expect(result.format()).to.be.equal('"f"');
    });

    it("onIdentifier", function () {
        let t = new FrappeRestQueryAstTransform();
        let result = t.onIdentifier('x');
        expect(result.format()).to.be.equal('x');
    });

    it("onLiteral", function () {
        let t = new FrappeRestQueryAstTransform();
        let result = t.onLiteral(1, 1);
        expect(result.format()).to.be.equal(1);
    });
});

describe("MySql Query AST Transforms", function () {

    it("orderby simulate", function() {
        let t = new MySQLAstTransform({
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
        expect(result).to.be.equal('"`id` ASC, `name` DESC"');
    })

    it("onLogicalExpression", function () {
        let t = new MySQLAstTransform();
        let left = AstValue('left', 'identifier', t.options.formatter);
        let right = AstValue('right', 'identifier', t.options.formatter);
        let result = t.onLogicalExpression('&&', left, right);
        expect(result.format()).to.be.equal('(left AND right)');
    });

    it("onLogicalExpression", function () {
        let t = new MySQLAstTransform({
            r: {
                id: 'id'
            }
        });
        let ast = jsep('(r.id > 1) && r.id < 5');
        let result = t.run(ast);
        expect(result).to.be.equal('(`id` > 1 AND `id` < 5)');
    });

    it("onBinaryExpression", function () {
        let t = new MySQLAstTransform();
        let left = AstValue('left', null, t.options.formatter);
        let right = AstValue('right', null, t.options.formatter);
        let result = t.onBinaryExpression('==', left, right);
        expect(result.format()).to.be.equal('"left" = "right"');
    });

    it("onBinaryExpression real", function () {
        let t = new MySQLAstTransform();
        let ast = jsep('"field" == "a string"');
        let result = t.run(ast);
        expect(result).to.be.equal('"field" = "a string"');
    });

    it("onBinaryExpression column", function () {
        let t = new MySQLAstTransform({
            r: {
                field: "field"
            }
        });
        let ast = jsep('r.field == "a string"');
        let result = t.run(ast);
        expect(result).to.be.equal('`field` = "a string"');
    });

    it("onCallExpression", function () {
        let t = new MySQLAstTransform();
        let callee = AstValue('like', 'indentifier', t.options.formatter);
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
        expect(result.format()).to.be.equal('x LIKE "a%"');
    });

    it("onMemberExpression", function () {
        let t = new MySQLAstTransform();
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
        expect(result.format()).to.be.equal('`fieldX`');
    });

    it("onMemberExpression computed", function () {
        let t = new MySQLAstTransform();
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
            value: 0,
            raw: 0
        })
        let result = t.onMemberExpression(true, obj, prop);
        expect(result.format()).to.be.equal('"f"');
    });

    it("onIdentifier", function () {
        let t = new MySQLAstTransform();
        let result = t.onIdentifier('x');
        expect(result.format()).to.be.equal('x');
    });

    it("onLiteral", function () {
        let t = new MySQLAstTransform();
        let result = t.onLiteral(1, 1);
        expect(result.format()).to.be.equal(1);
    });
});