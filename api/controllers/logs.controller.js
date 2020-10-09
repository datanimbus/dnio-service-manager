'use strict';

const mongoose = require(`mongoose`);
const definition = require(`../helpers/logs.definition.js`).definition;
const SMCrud = require(`@appveen/swagger-mongoose-crud`);
const schema = new mongoose.Schema(definition);
const logger = global.logger;

var options = {
	logger: logger,
	collectionName: `logs`,
	defaultFilter: {'name': `sm`}
};


var crudder = new SMCrud(schema, `logs`, options);


module.exports = {
	index: crudder.index,
	count: crudder.count
};