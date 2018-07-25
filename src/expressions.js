const jsep = require('jsep');
jsep.addBinaryOp("^");
jsep.addUnaryOp('@');
jsep.removeBinaryOp(">>>");
jsep.removeBinaryOp("<<<");
jsep.removeUnaryOp("~");

export class ExpressionBuilder {
    constructor(options) {
        this.options = options;
        this.ast = null;
    }

    parse(expOrArrowFn) {
        let src = expOrArrowFn.toString();
        let rx = /([^=>]+)\s*=>\s*(.+)/gi
        let result = rx.exec(src);
        this.ast = jsep(result[2]);
        return this;
    }

    transform(transform) {
        if ( !transform  ) {
            transform = this.options.transform;
        }

        return transform.run(this.ast);
    }

}