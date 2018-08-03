import { AstTransform, unwrap, AstValue } from '../astTransforms';

export function MySQLValueFormatter(astValue) {
  if (astValue.type == "string") {
    return JSON.stringify(astValue.value);
  } else if (astValue.type == "identifier") {
    return astValue.value;
  } else if (astValue.type == "number") {
    return astValue.value;
  } else if (astValue.type == "field" ) {
    return `\`${astValue.value}\``;
  }

  return astValue.value;
}

export default class MySQLAstTransform extends AstTransform {

    constructor(state, opts) {
      super(state, Object.assign({
        formatter: MySQLValueFormatter
      }, opts));
    }

    run(ast) {
      let result = super.run(ast);

      if ( typeof this.options.finalize == 'function' ) {
        return this.options.finalize(result);
      } else {
        return result;
      }
    }

    onLogicalExpression(op, left, right) {
      let opStr = ""

      if ( op == '&&' ) {
        opStr = "AND";
      } else if ( op == '||') {
        opStr = "OR";
      } else {
        new new Error(`Unsupported operator: ${op}`)
      }

      let leftValue = unwrap(left).format();
      let rightValue = unwrap(right).format();

      return AstValue(`(${leftValue} ${opStr} ${rightValue})`, 'logicalExpression', this.options.formatter);
    }

    onBinaryExpression(op, left, right) {
      let opStr = op;
      if ( opStr == '==' ) {
        opStr = '=';
      }
      let leftValue = unwrap(left).format();
      let rightValue = unwrap(right).format();

      return AstValue(`${leftValue} ${opStr} ${rightValue}`, 'binaryExpression', this.options.formatter);
    }

    onCallExpression(callee, args) {
        let calleeName = unwrap(callee).format().toLowerCase();
        let result = '';
        if ( calleeName == 'like' ) {
          let field = unwrap(args[0]).format();
          let match = unwrap(args[1]).format();
          result = `${field} LIKE ${match}`;
        } else if ( calleeName == 'notLike' ) {
          let field = unwrap(args[0]).format();
          let match = unwrap(args[1]).format();
          result = `${field} NOT LIKE ${match}`;
        } else if ( calleeName == 'asc' ) {
          let field = unwrap(args[0]).format();
          result = `${field} ASC`;
        } else if (calleeName == 'desc') {
          let field = unwrap(args[0]).format();
          result = `${field} DESC`;
        }

        result = AstValue(result, 'callExpression', this.options.formatter);
        return result;
    }

}