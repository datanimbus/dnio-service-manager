'use strict';

const definition = {'name': {'type':'String'}};
const { SMCrud, MakeSchema } = require('@appveen/swagger-mongoose-crud');
const schema = MakeSchema(definition);
const logger = global.logger;

var options = {
	logger: logger,
	collectionName: 'globalSchema.audit'
};

var crudder = new SMCrud(schema, 'globalSchema.audit', options);

module.exports = {
	index: crudder.index,
	count: crudder.count
};