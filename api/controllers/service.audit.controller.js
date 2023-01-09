'use strict';

const mongoose = require('mongoose');
const definition = {
	'name': {
		'type': 'String'
	},
	'timestamp':{
		'type': 'Date'
	},
	'user': {
		'type': 'String'
	},
	'txnId': {
		'type': 'String'
	}
};
const { SMCrud, MakeSchema } = require('@appveen/swagger-mongoose-crud');
const schema = MakeSchema(definition);
const logger = global.logger;

var options = {
	logger: logger,
	collectionName: 'services.audit'
};

var crudder = new SMCrud(schema, 'services.audit', options);

module.exports = {
	index: crudder.index,
	count: crudder.count
};