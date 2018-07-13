import * as queryUtils from './queryUtils';
export { Schema } from './schema';
export { ModelBase } from './modelBase';
export { ArrayModel } from './models/array';
import { ModelFacade } from './modelFacade';

export function createModel(options) {
    return new ModelFacade(options);
}

export { ModelFacade, queryUtils };