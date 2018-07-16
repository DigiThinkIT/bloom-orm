import * as queryUtils from './queryUtils';
import { Schema } from './schema';
import { ModelBase } from './modelBase';
import { ArrayModel } from './models/array';
import { ModelProxy } from './modelProxy';

export function createModel(options) {
    return new ModelProxy(options);
}

export { ModelProxy, queryUtils, Schema, ModelBase, ArrayModel };