import * as queryUtils from './queryUtils';
import { Schema } from './schema';
import { ModelBase } from './modelBase';
import { ModelProxy } from './modelProxy';
import ArrayModel from './models/array';
import RestModel from './models/rest';
import FrappeDoctypeModel from './models/frappeDoctype';
import * as astTransforms from './astTransforms';
import * as expressions from './expressions';
import FrappeRestQueryAstTransform from './astTransforms/frappe';
import MySQLAstTransform from './astTransforms/mysql';
import * as errors from './errors';

export function createModel(options) {
    return new ModelProxy(options);
}

const transforms = {
    expressions,
    astTransforms,
    FrappeRestQueryAstTransform,
    MySQLAstTransform
}

export { 
    ModelProxy, 
    queryUtils, 
    Schema, 
    ModelBase, 
    ArrayModel, 
    RestModel, 
    FrappeDoctypeModel,
    transforms,
    errors
};