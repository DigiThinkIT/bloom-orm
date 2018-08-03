import { AstTransform, unwrap, AstValue } from '../astTransforms';

export function FrappeValueFormatter(astValue) {
    if (astValue.type == "string") {
        return JSON.stringify(astValue.value);
    } else if (astValue.type == "identifier") {
        return astValue.value;
    } else if (astValue.type == "number") {
        return astValue.value;
    } else if (astValue.type == "field") {
        return JSON.stringify(astValue.value);
    }

    return astValue.value;
}

export default class FrappeRestQueryAstTransform extends AstTransform {

    constructor(state, opts) {
        super(state, Object.assign({
            formatter: FrappeValueFormatter
        }, opts));
    }

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

    onLogicalExpression(op, left, right) {
        left = unwrap(left).format();
        right = unwrap(right).format();
        if ( op != '&&' ) {
            new new Error(`Unsupported operator: ${op}`)
        }
        return AstValue(`[${left}, ${right}]`, 'logicalExpression', this.options.formatter);
    }

    onBinaryExpression(op, left, right) {
        let leftValue = unwrap(left).format();
        let rightValue = unwrap(right).format();
        if ( op == '==' ) {
            op = '=';
        }
        return AstValue(`[${leftValue}, "${op}", ${rightValue}]`, 'binaryExpression', this.options.formatter);
    }

    onCallExpression(callee, args) {
        let calleeName = unwrap(callee).format().toLowerCase();
        let result = '';
        if ( calleeName == 'like' ) {
            let field = unwrap(args[0]).format();
            let match = unwrap(args[1]).format();
            result = `[${field}, "LIKE", ${match}]`;
        } else if ( calleeName == 'asc' ) {
            // frappe's asc, desc are only used during order_by calls
            // which it self is a string that breaks formatting as handled
            // by filter queries.
            // We'll swap field type so we don't double quote fields.
            let field = AstValue(unwrap(args[0]).value, "identifier", this.options.formatter).format();
            result = `${field} ASC`;
        } else if (calleeName == 'desc') {
            let field = AstValue(unwrap(args[0]).value, "identifier", this.options.formatter).format();
            result = `${field} DESC`;
        }

        return AstValue(result, 'callExpression', this.options.formatter);
    }

}