'use strict';

const definition = require('../helpers/logs.definition.js').definition;
const { SMCrud, MakeSchema } = require('@appveen/swagger-mongoose-crud');
const schema = MakeSchema(definition);
const logger = global.logger;

var options = {
	logger: logger,
	collectionName: 'logs',
	defaultFilter: {'name': 'sm'}
};


var crudder = new SMCrud(schema, 'logs', options);


module.exports = {
	index: crudder.index,
	count: crudder.count
};