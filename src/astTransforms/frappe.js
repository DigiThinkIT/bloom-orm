import { AstTransform } from '../astTransforms';

export default class FrappeRestQueryAstTransform extends AstTransform {

    run(ast) {
        let result = super.run(ast);

        if ( typeof this.options.finalize == 'function' ) {
            return this.options.finalize(result);
        } else {
            if ( result.charAt(1) != '[' ) {
                result = `[${result}]`;
            }
            return result;
        }
    }

    onArrayExpression(elements) {
        var elResolved = elements.reduce((c, v) => {
            let value = v();
            c.push(value);
            return c;
        }, []);

        return elResolved.join(', ');
    }

    onLogicalExpression(op, left, right) {
        if ( op != '&&' ) {
            new new Error(`Unsupported operator: ${op}`)
        }
        return `[${left()}, ${right()}]`;
    }

    onBinaryExpression(op, left, right) {
        return `["${left()}", "${op}", ${right()}]`;
    }

    onCallExpression(callee, args) {
        let calleeName = callee().toLowerCase();
        if ( calleeName == 'like' ) {
            let field = args[0]();
            let match = args[1]();
            if ( typeof match == 'string' ) {
                match = JSON.stringify(match);
            }
            return `["${field}", "LIKE", ${match}]`;
        } else if ( calleeName == 'asc' ) {
            let field = args[0]();
            return `${field} ASC`;
        } else if (calleeName == 'desc') {
            let field = args[0]();
            return `${field} DESC`;
        }
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

}