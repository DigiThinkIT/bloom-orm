
export class AstTransform {
    constructor(state, opts) {
        this.state = state;
        this.options = Object.assign({
            debug: false,
            allowBinaryExpressions: true,
            allowLogicalExpressions: true,
            allowMemberExpressions: true,
            allowCallExpressions: true,
            allowLiterals: true,
            allowIdentifier: true,
            allowArrayExpression: false,
            formatter: deafultFormatter
        }, opts);
    }

    run(ast) {
        if ( this.options.debug ) {
            console.log(JSON.stringify(ast, null, '  '));
        }

        let expFn = this.buildAstFnTree(ast);
        return unwrap(expFn).format();
    }

    buildAstFnTree(ast) {       
        let expFn = null;
        if (ast.type == 'BinaryExpression' && this.options.allowBinaryExpressions ) {
            expFn = this.onBinaryExpression.bind(this, 
                ast.operator,
                this.buildAstFnTree(ast.left),
                this.buildAstFnTree(ast.right)
            );
        } else if (ast.type == 'LogicalExpression' && this.options.allowLogicalExpressions ) {
            expFn = this.onLogicalExpression.bind(this,
                ast.operator,
                this.buildAstFnTree(ast.left),
                this.buildAstFnTree(ast.right)
            );
        } else if (ast.type == 'MemberExpression' && this.options.allowMemberExpressions ) {
            expFn = this.onMemberExpression.bind(this,
                ast.computed,
                this.buildAstFnTree(ast.object),
                this.buildAstFnTree(ast.property)
            );
        } else if (ast.type == 'Identifier' && this.options.allowIdentifier ) {
            expFn = this.onIdentifier.bind(this,
                ast.name
            );
        } else if (ast.type == 'Literal' && this.options.allowLiterals ) {
            expFn = this.onLiteral.bind(this,
                ast.value,
                ast.raw
            );
        } else if (ast.type == 'CallExpression' && this.options.allowCallExpressions ) {
            let args = ast.arguments.reduce((c, v) => {
                c.push(this.buildAstFnTree(v));
                return c;
            }, []);

            expFn = this.onCallExpression.bind(this,
                this.buildAstFnTree(ast.callee),
                args
            );
        } else if (ast.type == "ArrayExpression" && this.options.allowArrayExpression) {
            let elements = ast.elements.reduce((c, v) => {
                c.push(this.buildAstFnTree(v));
                return c;
            }, []);
            expFn = this.onArrayExpression.bind(this, elements);
        } else {
            throw new Error(`Unhandled ast type: ${ast.type}`);
        }

        return expFn;
    }

    onArrayExpression(elements) {
        var elResolved = elements.reduce((c, v) => {
            let value = unwrap(v);
            c.push(value.format());
            return c;
        }, []);

        let result = AstValue(elResolved.join(', '), 'arrayExpression', this.options.formatter);
        return result;
    }

    onLogicalExpression(op, left, right) {
        left = unwrap(left).format();
        right = unwrap(right).format();
        return AstValue(`${left} ${op} ${right}`, 'logicalExpression', this.options.formatter);
    }

    onBinaryExpression(op, left, right) {
        let leftValue = unwrap(left).format();
        let rightValue = unwrap(right).format();
        return AstValue(`${leftValue} ${op} ${rightValue}`, 'binaryExpression', this.options.format);
    }

    onCallExpression(callee, args) {
        var argsResolved = args.reduce((c, v) => {
            let value = unwrap(v).format();
            c.push(value);
            return c;
        }, []);
        return AstValue(`${callee()}(${argsResolved.join(', ')})`, 'callExpression', this.options.format);
    }

    onMemberExpression(computed, obj, property) {
        if (computed) {
            let objInst = unwrap(obj).value;
            let comp = unwrap(property).format();
            let value = objInst[comp];
            let objValue = AstValue(value, null, this.options.formatter);
            return objValue;
        } else {
            let objKey = unwrap(obj).format();
            let prop = unwrap(property).format();
            let objInst = this.state[objKey];
            let value = objInst[prop];
            let type = objKey == 'r' ? 'field' : typeof value;
            let objValue = AstValue(value, type, this.options.formatter);
            return objValue;
        }
    }

    onIdentifier(name) {
        return AstValue(name, "identifier", this.options.formatter);
    }

    onLiteral(value, raw) {
        return AstValue(value, null, this.options.formatter);
    }
}

export function unwrap(value) {
    while(typeof value === 'function') {
        value = value();
    }

    return value;
}

export function deafultFormatter(astValue) {
    if (astValue.type == "string") {
        return JSON.stringify(astValue.value);
    } else if (astValue.type == "identifier") {
        return astValue.value;
    } else if (astValue.type == "number") {
        return astValue.value;
    }

    return astValue.value;
}

export function AstValue(value, type, formatter) {
    if (!type) {
        type = typeof value;
    }
    if (!formatter) {
        formatter = deafultFormatter;
    }

    return {
        value,
        type,
        [Symbol.toPrimitive](hint) {
            return value;
        },
        format() {
            return (formatter) ? formatter({ value, type }) : value;
        }
    };
}