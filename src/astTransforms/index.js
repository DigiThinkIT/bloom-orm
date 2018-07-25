
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
            allowArrayExpression: false
        }, opts);
    }

    run(ast) {
        if ( this.options.debug ) {
            console.log(JSON.stringify(ast, null, '  '));
        }

        let expFn = this.buildAstFnTree(ast);
        return expFn();
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
            let value = v();
            if (typeof value == 'string') {
                value = JSON.stringify(value);
            }
            c.push(value);
            return c;
        }, []);

        return elResolved.join(', ');
    }

    onLogicalExpression(op, left, right) {

        return `${left()} ${op} ${right()}`;
    }

    onBinaryExpression(op, left, right) {
        let rightValue = right();
        if ( typeof rightValue == 'string' ) {
            rightValue = JSON.stringify(rightValue);
        }
        return `${left()} ${op} ${rightValue}`;
    }

    onCallExpression(callee, args) {
        var argsResolved = args.reduce((c, v) => {
            let value = v();
            if ( typeof value == 'string' ) {
                value = JSON.stringify(value);
            }
            c.push(value);
            return c;
        }, []);
        return `${callee()}(${argsResolved.join(', ')})`;
    }

    onMemberExpression(computed, obj, property) {
        if (computed) {
            let objInst = obj();
            let comp = property();
            let objValue = objInst[comp];
            return objValue;
        } else {
            let objKey = obj();
            let objInst = this.state[objKey];
            let objValue = objInst[property()];
            return objValue;
        }
    }

    onIdentifier(name) {
        return name;
    }

    onLiteral(value, raw) {
        return value;
    }
}