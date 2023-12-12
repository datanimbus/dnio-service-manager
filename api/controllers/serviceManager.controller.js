'use strict';

const net = require('net');
const mongoose = require('mongoose');
const request = require('../../util/got-request-wrapper');
const _ = require('lodash');
const yamljs = require('json-to-pretty-yaml');

const { SMCrud, MakeSchema } = require('@appveen/swagger-mongoose-crud');
const cuti = require('@appveen/utils');
const dataStackutils = require('@appveen/data.stack-utils'); //Common utils for Project
const kubeutil = require('@appveen/data.stack-utils').kubeutil;

const k8s = require('../../util/k8s.js');
let rolesUtil = require('../helpers/roles');
let queueMgmt = require('../../util/queueMgmt');
const envConfig = require('../../config/config.js');
const smhelper = require('../helpers/util/smhelper');
const deployUtil = require('../deploy/deploymentUtil');
const xlsxUtils = require('../helpers/util/xlsx.utils');
const smHooks = require('../helpers/serviceManagerHooks.js');
const relationManager = require('../helpers/relationManager.js');
const expandRelationHelper = require('../helpers/util/expandRelations');
const globalDefHelper = require('../helpers/util/globalDefinitionHelper.js');
const schemaValidate = require('../helpers/util/smhelper.js').schemaValidate;
const definition = require('../helpers/serviceManager.definition.js').definition;
let getCalendarDSDefinition = require('../helpers/calendar').getCalendarDSDefinition;
const schemaValidateDefault = require('../helpers/util/smhelper.js').schemaValidateDefault;


const startPort = 20010;
const logger = global.logger;
var client = queueMgmt.client;
const destroyDeploymentRetry = 5;
const draftDefinition = JSON.parse(JSON.stringify(definition));


const schema = MakeSchema(definition, {
	usePushEach: true
});
const draftSchema = MakeSchema(draftDefinition, {
	usePushEach: true
});


var options = {
	logger: logger,
	collectionName: 'services'
};
var draftOptions = {
	logger: logger,
	collectionName: 'services.draft'
};


schema.pre('validate', function (next) {
	let self = this;
	let txnId = self.req && self.req.headers && self.req.headers['TxnId'];
	logger.debug(`[${txnId}] Service :: Validating service name and definition are not empty`);

	self.name = self.name.trim();
	self.api ? self.api = self.api.trim() : `/${_.camelCase(self.name)}`;

	if (self.workflowConfig && self.workflowConfig.makerCheckers && self.workflowConfig.makerCheckers[0]) {
		self.workflowConfig.makerCheckers[0].steps.forEach(item => {
			item.name = item.name.trim();
		});
	}

	if (self.name && _.isEmpty(self.name)) next(new Error('name is empty'));
	if (self.definition && _.isEmpty(self.definition) && !self.schemaFree) next(new Error('definition is empty'));
	if (!_.isEmpty(self.preHooks)) {
		let preHookNames = _.uniq(self.preHooks.map(_d => _d.name));
		if (preHookNames.length != self.preHooks.length) {
			next(new Error('Prehooks contains duplicate name'));
		}
	}
	next();
});

draftSchema.pre('validate', function (next) {
	let self = this;
	let txnId = self.req && self.req.headers && self.req.headers['TxnId'];
	logger.debug(`[${txnId}] Draft Service :: Validating service name and definition not empty`);

	self.name = self.name.trim();
	self.api = self.api.trim();

	if (self.workflowConfig && self.workflowConfig.makerCheckers && self.workflowConfig.makerCheckers[0]) {
		self.workflowConfig.makerCheckers[0].steps.forEach(item => {
			item.name = item.name.trim();
		});
	}

	if (_.isEmpty(self.name)) next(new Error('name is empty'));
	if (_.isEmpty(self.definition) && !self.schemaFree) next(new Error('definition is empty'));
	if (!_.isEmpty(self.preHooks)) {
		let preHookNames = _.uniq(self.preHooks.map(_d => _d.name));
		if (preHookNames.length != self.preHooks.length) {
			next(new Error('Prehooks contains duplicate name'));
		}
	}
	next();
});


schema.index({ api: 1, app: 1 }, { unique: true });

schema.index({ name: 1, app: 1 }, { unique: true });


schema.post('save', function (error, doc, next) {
	if ((error.errors && error.errors.api) || error.name === 'ValidationError' && error.message.indexOf('__CUSTOM_API_DUPLICATE_ERROR__') > -1) {
		next(new Error('API endpoint is already in use'));
	} else {
		next(error);
	}
});

schema.post('save', function (error, doc, next) {
	if ((error.errors && error.errors.name) || error.name === 'ValidationError' && error.message.indexOf('__CUSTOM_NAME_DUPLICATE_ERROR__') > -1) {
		next(new Error('Entity name is already in use'));
	} else {
		next(error);
	}
});


draftSchema.pre('validate', function (next) {
	let self = this;
	let txnId = self.req && self.req.headers && self.req.headers['TxnId'];
	logger.debug(`[${txnId}] Draft Service :: Validating if API endpoint is already in use`);
	return crudder.model.findOne({ app: self.app, api: self.api, _id: { $ne: self._id } }, { _id: 1 })
		.then(_d => {
			if (_d) {
				return next(new Error('API endpoint is already in use'));
			} else {
				return draftCrudder.model.findOne({ app: self.app, api: self.api, _id: { $ne: self._id } }, { _id: 1 })
					.then(_e => {
						if (_e) return next(new Error('API endpoint is already in use'));
						return next();
					});
			}
		})
		.catch(err => {
			logger.error(err);
			next(err);
		});
});

draftSchema.pre('validate', function (next) {
	let self = this;
	let txnId = self.req && self.req.headers && self.req.headers['TxnId'];
	logger.debug(`[${txnId}] Draft Service :: Validating if service name is already in use`);
	return crudder.model.findOne({ app: self.app, name: self.name, _id: { $ne: self._id } }, { _id: 1 })
		.then(_d => {
			if (_d) {
				return next(new Error('Entity name is already in use'));
			} else {
				return draftCrudder.model.findOne({ app: self.app, name: self.name, _id: { $ne: self._id } }, { _id: 1 })
					.then(_e => {
						if (_e) {
							return next(new Error('Entity name is already in use'));
						}
						return next();
					});
			}
		})
		.catch(err => {
			logger.error(err);
			next(err);
		});
});

schema.pre('validate', function (next) {
	let self = this;
	let app = self.app;
	let txnId = self.req && self.req.headers && self.req.headers['TxnId'];
	logger.debug(`[${txnId}] Service Pre:: Validating if API endpoint and name are in use for internal service`);

	let dsCalendarDetails = getCalendarDSDetails(app);
	if (self.isNew && self.type != 'internal') {
		if (self.name == dsCalendarDetails.name) return next(new Error('Cannot use this name.'));
		else if (self.api == dsCalendarDetails.api) return next(new Error('Cannot use this API'));
		else next();
	}
	next();
});

schema.pre('save', function (next, req) {
	let self = this;
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.debug(`[${txnId}] Service Pre :: Validating if service is schemafree`);

	if (self.schemaFree) {
		if (self.stateModel && self.stateModel.enabled) {
			next(new Error('Schema Free service can not have state model enabled.'));
		}
		if (self.workflowConfig && self.workflowConfig.enabled) {
			next(new Error('Schema Free service can not have workflow enabled.'));
		}
	}
	next();
});

draftSchema.pre('save', function (next, req) {
	let self = this;
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.debug(`[${txnId}] Draft Service Pre :: Adding metadata details`);

	if (self.schemaFree) {
		if (self.stateModel && self.stateModel.enabled) {
			next(new Error('Schema Free service can not have state model enabled.'));
		}
		if (self.workflowConfig && self.workflowConfig.enabled) {
			next(new Error('Schema Free service can not have workflow enabled.'));
		}
	}
	next();
});

schema.pre('save', function (next, req) {
	let self = this;
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.debug(`[${txnId}] Service Pre :: Adding metadata details`);

	if (self._metadata.version) {
		self._metadata.version.release = envConfig.RELEASE;
	}
	let user = req.headers ? req.headers.user : 'AUTO';
	self._metadata.lastUpdatedBy = user;
	if (!self.allowedFileTypes || self.allowedFileTypes.length === 0) {
		self.allowedFileTypes = envConfig.allowedExt;
	}
	next();
});

draftSchema.pre('save', function (next, req) {
	let self = this;
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.debug(`[${txnId}] Draft Service Pre :: Adding metadata details`);

	let user = req.headers ? req.headers.user : 'AUTO';
	self._metadata.lastUpdatedBy = user;
	next();
});

schema.pre('save', function (next, req) {
	let self = this;
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.debug(`[${txnId}] Service Pre :: Validating definition`);
	try {
		if (self.definition) schemaValidate(self.definition);
		next();
	} catch (error) {
		next(error);
	}
});

draftSchema.pre('save', function (next, req) {
	let self = this;
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.debug(`[${txnId}] Draft Service Pre :: Validating definition`);
	try {
		schemaValidate(self.definition);
		next();
	} catch (error) {
		next(error);
	}
});

function reserved(def) {
	var keywords = ['schema', 'collection', 'db', 'save', 'get', 'model', 'default', 'modelname'];
	var promise = def.map(ele => {
		if (ele.key && keywords.includes(ele.key.toLowerCase()))
			throw new Error(ele.key + ' cannot be used as an attribute name');
		if ((ele.type == 'Object' || ele.type == 'Array') && !ele.properties.schemaFree)
			return reserved(ele.definition);
	});
	return Promise.all(promise);
}

schema.pre('save', function (next, req) {
	let self = this;
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.debug(`[${txnId}] Service Pre :: Checking attribute names for reserved words`);
	try {
		if (self.definition) reserved(self.definition);
		next();
	} catch (error) {
		next(error);
	}
});

draftSchema.pre('save', function (next, req) {
	let self = this;
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.debug(`[${txnId}] Draft Service Pre :: Checking attribute names for reserved words`);
	try {
		reserved(self.definition);
		next();
	} catch (error) {
		next(error);
	}
});

schema.pre('save', function (next, req) {
	let self = this;
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.debug(`[${txnId}] Service Pre :: Validating schema fields for default value`);
	if (self.definition) {
		schemaValidateDefault(self.definition, self.app)
			.then(() => {
				next();
			})
			.catch(err => {
				next(err);
			});
	} else {
		next();
	}

});

draftSchema.pre('save', function (next, req) {
	let self = this;
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.debug(`[${txnId}] Draft Service Pre :: Validating schema fields for default value`);
	schemaValidateDefault(self.definition, self.app)
		.then(() => {
			next();
		})
		.catch(err => {
			next(err);
		});
});

function apiUniqueCheck(api, app, id) {
	let apiRegex = new RegExp('^' + api + '$', 'i');
	let filter = { 'app': app, 'api': apiRegex };
	if (id) filter._id = { '$ne': id };
	logger.debug(`apiUniqueCheck filter :: ${JSON.stringify(filter)}`);
	return crudder.model.findOne(filter).lean(true)
		.then(_d => {
			if (_d) {
				return Promise.reject(new Error('API already in use'));
			} else {
				return draftCrudder.model.findOne(filter).lean(true)
					.then(_e => {
						if (_e) {
							return Promise.reject(new Error('API already in use with draft mode'));
						} else {
							return Promise.resolve();
						}
					});

			}
		});
}

function nameUniqueCheck(name, app, srvcId) {
	let nameRegex = new RegExp('^' + name + '$', 'i');
	let filter = { 'app': app, 'name': nameRegex };
	if (srvcId) filter._id = { '$ne': srvcId };
	return crudder.model.findOne(filter).lean(true)
		.then(_d => {
			if (_d) {
				return Promise.reject(new Error('Entity name already in use'));
			} else {
				return draftCrudder.model.findOne(filter).lean(true)
					.then(_e => {
						if (_e) {
							return Promise.reject(new Error('Entity name already in use'));
						} else {
							return Promise.resolve();
						}
					});
			}
		});
}

schema.pre('save', function (next, req) {
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.debug(`[${txnId}] Service Pre :: Validating service name must be less than 40 characters`);
	if (this.name.length > 40) {
		next(new Error('Entity name must be less than 40 characters. '));
	} else {
		next();
	}
});

draftSchema.pre('save', function (next, req) {
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.debug(`[${txnId}] Draft Service Pre :: Validating service name must be less than 40 characters`);
	if (this.name.length > 40) {
		next(new Error('Entity name must be less than 40 characters. '));
	} else {
		next();
	}
});

schema.pre('save', function (next, req) {
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.debug(`[${txnId}] Service Pre :: Validating service description must be less than 250 characters`);
	if (this.description && this.description.length > 250) {
		next(new Error('Entity description should not be more than 250 character '));
	} else {
		next();
	}
});

draftSchema.pre('save', function (next, req) {
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.debug(`[${txnId}] Draft Service Pre :: Validating service description must be less than 250 characters`);
	if (this.description && this.description.length > 250) {
		next(new Error('Entity description should not be more than 250 character '));
	} else {
		next();
	}
});

schema.pre('save', cuti.counter.getIdGenerator('SRVC', 'services', null, null, 2000));

schema.pre('save', function (next, req) {
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.debug(`[${txnId}] Service Pre :: Validating API endpoint name must be less than 40 characters`);

	// One extra character for / in api
	var apiregx = /^\/[a-zA-Z]+[a-zA-Z0-9]*$/;
	// var nameregx = /^[a-zA-Z]+[a-zA-Z0-9_ -]*$/;

	if (this.api.length > 41) {
		return next(new Error('API endpoint length cannot be greater than 40'));
	}
	if (this.api.match(apiregx)) {
		return next();
		// if (this.name.match(nameregx)) {
		// 	next();
		// } else {
		// 	return next(new Error('Service name must consist of alphanumeric characters and/or an underscore and space and must start with an alphabet.'));
		// }
	} else {
		return next(new Error('API Endpoint must consist of alphanumeric characters and must start with \'/\' and followed by an alphabet.'));
	}
});

draftSchema.pre('save', function (next, req) {
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.debug(`[${txnId}] Draft Service Pre :: Validating API endpoint name must be less than 40 characters`);

	// One extra character for / in api
	var apiregx = /^\/[a-zA-Z]+[a-zA-Z0-9]*$/;
	// var nameregx = /^[a-zA-Z]+[a-zA-Z0-9_ -]*$/;

	if (this.api.length > 41) {
		return next(new Error('API endpoint length cannot be greater than 40'));
	}
	if (this.api.match(apiregx)) {
		next();
	} else {
		next(new Error('API Endpoint must consist of alphanumeric characters and must start with \'/\' and followed by an alphabet.'));
	}
	// if (this.name.match(nameregx)) {
	// 	next();
	// } else {
	// 	next(new Error('Service name must consist of alphanumeric characters and/or an underscore and space and must start with an alphabet.'));
	// }
	next();
});

schema.pre('save', function (next) {
	if (envConfig.isCosmosDB()) {
		this.collectionName = this._id;
	} else {
		this.collectionName = this.connectors?.data?.options?.tableName || this.api.substr(1);
	}
	next();
});

draftSchema.pre('save', function (next) {
	if (envConfig.isCosmosDB()) {
		this.collectionName = this._id;
	} else {
		this.collectionName = this.connectors?.data?.options?.tableName || this.api.substr(1);
	}
	next();
});

schema.pre('save', async function (next, req) {
	let txnId = req && req.headers && req.headers['TxnId'];
	try {
		if (!this.isNew && this.stateModel && this.stateModel.enabled && this.isStateModelChanged) {
			logger.info(`[${txnId}] Updating existing records with initial state in state model for service :: ${this._id}`);
			let obj = {};
			obj[this.stateModel.attribute] = this.stateModel.initialStates[0];
			let status;
			if (this.oldModel.states) {
				let states = Object.keys(this.oldModel.states).filter((state) => { if (this.oldModel.states[state].length == 0) return state; });
				status = await global.mongoConnection.db(`${process.env.DATA_STACK_NAMESPACE}-${this.app}`).collection(this.collectionName).updateMany({ [this.stateModel.attribute]: { '$nin': states } }, { $set: obj });
			} else {
				status = await global.mongoConnection.db(`${process.env.DATA_STACK_NAMESPACE}-${this.app}`).collection(this.collectionName).updateMany({}, { $set: obj });
			}

			logger.debug(`[${txnId}] Initial States updated :: ${JSON.stringify(status.result)}`);
		}
		next();
	} catch (err) {
		logger.error(`[${txnId}] Error updating initial state of existing records`);
		next(err);
	}
});

schema.pre('save', async function (next, req) {
	let txnId = req && req.headers && req.headers['TxnId'];
	try {
		if (!this.isNew && this.workflowConfig && this.workflowConfig.enabled && this.isWorkflowChanged) {
			logger.info(`[${txnId}] Updating existing work items to first step for service :: ${this._id}`);
			let collection = global.mongoConnection.db(`${process.env.DATA_STACK_NAMESPACE}-${this.app}`).collection(`${this.collectionName}.workflow`);
			let workItems = await collection.find({ status: 'Pending', app: this.app, serviceId: this._id });
			workItems.forEach(item => {
				let obj = {};
				obj.checkerStep = this.workflowConfig.makerCheckers[0].steps[0].name;
				obj.respondedBy = null;
				obj.audit = [item.audit[0]];
				collection.findOneAndUpdate({ _id: item._id }, { $set: obj });
			});
		}
		next();
	} catch (err) {
		logger.error(`[${txnId}] Error updating initial state of existing records`);
		next(err);
	}
});

function countAttr(def) {
	let count = 0;
	if (def && typeof def === 'object') {
		def.forEach(_d => {
			if ((_d && _d.type === 'Object') && !_d.properties.schemaFree) {
				count += countAttr(_d.definition);
			} else {
				count++;
			}
		});
		return count;
	} else {
		return count;
	}
}

schema.pre('save', function (next) {
	let self = this;
	if (!self.definition) next();
	this.attributeCount = countAttr(self.definition);
	next();
});

draftSchema.pre('save', function (next) {
	let self = this;
	this.attributeCount = countAttr(self.definition);
	next();
});

schema.pre('save', dataStackutils.auditTrail.getAuditPreSaveHook('services'));

schema.post('save', dataStackutils.auditTrail.getAuditPostSaveHook('sm.audit', client, 'auditQueue'));

schema.pre('remove', dataStackutils.auditTrail.getAuditPreRemoveHook());

schema.post('remove', dataStackutils.auditTrail.getAuditPostRemoveHook('sm.audit', client, 'auditQueue'));

var crudder = new SMCrud(schema, 'services', options);
var draftCrudder = new SMCrud(draftSchema, 'services.draft', draftOptions);

var e = {};

function getNextVal(_docs) {
	let nextPort = _docs[0].port + 1;
	for (var i = 1; i < _docs.length; i++) {
		if (nextPort !== _docs[i].port) break;
		else nextPort++;
	}
	return nextPort;
}

function getNextPort() {
	return mongoose.model('services').find({}, 'port', {
		sort: {
			port: 1
		}
	})
		.then((docs) => {
			if (docs && docs.length > 0) {
				return getNextVal(docs);
			} else {
				return startPort;
			}
		});
}

function checkIncomingRelation(serviceId, app) {
	return new Promise((resolve, reject) => {
		crudder.model.findOne({ _id: serviceId, app: app, '_metadata.deleted': false })
			.then((_doc) => {
				if (_doc) {
					_doc = _doc.toObject();
					if (_doc.relatedSchemas && _doc.relatedSchemas.incoming && !_.isEmpty(_doc.relatedSchemas.incoming)) {
						let extService = _doc.relatedSchemas.incoming.map(obj => obj.service);
						extService = _.uniq(extService);
						var c1 = extService.length;
						if (c1 === 1 && extService[0] === serviceId) {
							return resolve(_doc);
						}
						let rejectFlag = false;
						let relatedEntities = [];
						return crudder.model.find({ _id: { $in: extService } }, 'status name')
							.then(_docStatus => {
								_docStatus.forEach(docObj => {
									if (docObj.status != 'Undeployed' && docObj._id != serviceId) {
										rejectFlag = true;
										relatedEntities.push(docObj.name);
										// return;
									}
								});
								if (rejectFlag) reject({
									relatedEntities: relatedEntities,
									name: _doc.name
								});
								else resolve(_doc);
							});
					} else {
						return draftCrudder.model.find({ 'relatedSchemas.incoming.service': serviceId }, { name: 1 })
							.then(_d => {
								if (_d.length === 0) {
									resolve(_doc);
								} else {
									reject({
										relatedEntities: _d.map(_e => _e.name),
										name: _doc.name
									});
								}
							});
					}
				} else {
					resolve();
				}
			})
			.catch((err) => reject(err));
	});
}

// function checkOutGoingRelation(serviceId) {
// 	return new Promise((resolve, reject) => {
// 		crudder.model.findOne({
// 			_id: serviceId,
// 			'_metadata.deleted': false
// 		})
// 			.then((_doc) => {
// 				if (_doc) {
// 					_doc = _doc.toObject();
// 					if (_doc.relatedSchemas.outgoing && !_.isEmpty(_doc.relatedSchemas.outgoing)) {
// 						let extService = _doc.relatedSchemas.outgoing.map(obj => obj.service);
// 						extService = _.uniq(extService);
// 						let rejectFlag = false;
// 						let relatedEntities = [];
// 						crudder.model.find({
// 							_id: {
// 								$in: extService
// 							}
// 						}, 'status name')
// 							.then(_docStatus => {
// 								_docStatus.forEach(docObj => {
// 									if (docObj.status == 'Undeployed') {
// 										rejectFlag = true;
// 										relatedEntities.push(docObj.name);
// 										// return;
// 									}
// 								});
// 								var c = extService.length;
// 								if (c == 1 && extService[0] == serviceId) {
// 									resolve(_doc);
// 								} else {
// 									if (rejectFlag) {
// 										reject({
// 											relatedEntities: relatedEntities,
// 											name: _doc.name
// 										});
// 									} else {
// 										resolve(_doc);
// 									}
// 								}
// 							});
// 					} else {
// 						resolve(_doc);
// 					}
// 				} else {
// 					resolve();
// 				}
// 			})
// 			.catch((err) => reject(err));
// 	});
// }

//remove incoming relation of the entity 
function removeIncomingRelation(serviceId, req) {
	let txnId = req && req.headers && req.headers['TxnId'];
	logger.info(`[${txnId}] ${serviceId} : Removing incoming relationships`);
	let promiseArr = [];
	return crudder.model.find({ 'relatedSchemas.incoming.service': serviceId })
		.then(docs => {
			logger.info(`[${txnId}] ${serviceId} : Found ${docs.length} incoming relationships`);
			docs.forEach(doc => {
				if (doc && !_.isEmpty(doc.relatedSchemas.incoming)) {
					doc.relatedSchemas.incoming = doc.relatedSchemas.incoming.filter(obj => obj.service != serviceId);
					doc.markModified('relatedSchemas.incoming');
					promiseArr.push(doc.save(req));
				}
			});
			return Promise.all(promiseArr);
		});
}

function createWebHooks(data, _req) {
	let txnId = _req.get('TxnId');
	let id = data._id;
	var options = {
		url: envConfig.baseUrlNE + '/webHook',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'TxnId': _req.get('txnId'),
			'Authorization': _req.get('Authorization')
		},
		json: true,
		body: data
	};
	request.post(options, function (err, res) {
		if (err) {
			logger.error(`[${txnId}] Create webhook :: ${id} :: ${err.message}`);
		} else if (!res) logger.error(`[${txnId}] Create webhook :: ${id} :: Notification Engine down`);
		else {
			logger.info(`[${txnId}] Create webhook :: ${id} :: WebHook added`);
		}
	});
}
// To verify whether given webHook or preHook is exist or not
/*
e.verifyHook = (_req, _res) => {
	let url = _req.params.url && _req.swagger.params.url.value ? _req.swagger.params.url : null;
	if (!url) {
		return _res.status(400).json({ 'message': 'url invalid' });
	}
	let isVerified = false;
	var options = {
		url: url,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		json: true
	};
	if (typeof process.env.TLS_REJECT_UNAUTHORIZED === 'string' && process.env.TLS_REJECT_UNAUTHORIZED.toLowerCase() === 'false') {
		options.insecure = true;
		options.rejectUnauthorized = false;
	}
	request.post(options, function (err, res) {
		if (err) {
			logger.error(err.message);
		} else if (!res) {
			logger.error(url + ' ' + 'is down');
		}
		else if (res.statusCode === 404 || res.statusCode === 504 || res.statusCode === 405) {
			logger.info(url + ' ' + ' not exist');
		}
		else {
			logger.info(url + ' ' + 'exist');
			isVerified = true;
		}
		_res.status(200).json({ isVerified });
	});
};
*/
e.verifyHook = (_req, _res) => {
	let URL = require('url');
	let url = _req.query.url ? _req.query.url : null;
	if (!url) {
		return _res.status(400).json({
			'message': 'url invalid'
		});
	}
	let urlObj = URL.parse(url);
	let client = new net.Socket();
	urlObj.port = urlObj.port ? urlObj.port : 80;
	if (urlObj.port < 0 || urlObj.port >= 65536) {
		return _res.status(400).end();
	}
	client.connect(urlObj.port, urlObj.hostname, function () {
		_res.status(200).end();
		client.destroy();
	});

	client.on('connect', function () {
		client.destroy();
	});

	client.on('error', function (data) {
		logger.debug('Received: ' + data);
		_res.status(400).end();
		client.destroy();
	});

	client.on('close', function () {
		if (!_res.headersSent) {
			_res.status(400).end();
		}
	});
	let timeout = (envConfig.HOOK_CONNECTION_TIMEOUT && parseInt(envConfig.HOOK_CONNECTION_TIMEOUT)) || 30;
	setTimeout(function () {
		client.destroy();
	}, timeout * 1000);
};

function removeWebHooks(serviceId, _req) {
	let txnId = _req.get('TxnId');
	logger.debug(`[${txnId}] Removing web hooks :: ${serviceId}`);
	var options = {
		url: envConfig.baseUrlNE + '/webHook/' + serviceId,
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			'TxnId': txnId,
			'Authorization': _req.get('Authorization')
		},
		json: true
	};
	request.delete(options, function (err, res) {
		if (err) logger.error(`[${txnId}] Remove web hooks :: ${serviceId} :: ${err.message}`);
		else if (!res) logger.error(`[${txnId}] Remove web hooks :: ${serviceId} :: Notification Engine down!`);
		else logger.info(`[${txnId}] Remove web hooks :: ${serviceId} :: Done!`);
	});
}

function updateWebHook(id, data, _req) {
	let txnId = _req.get('TxnId');
	logger.debug(`[${txnId}] Updating web hooks :: ${id}`);
	var options = {
		url: envConfig.baseUrlNE + '/webHook/' + id,
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			'TxnId': txnId,
			'Authorization': _req.get('Authorization')
		},
		json: true,
		body: {
			hookUrls: data.webHooks,
			// workflowHookUrls: data.workflowHooks
			workflowHooks: data.workflowHooks
		}
	};
	logger.trace(`[${txnId}] Updating web hooks :: ${id} :: ${JSON.stringify(options)}`);
	new Promise((resolve, reject) => request.put(options, function (err, res) {
		if (err) {
			logger.error(`[${txnId}] Updating web hooks :: ${id} :: ${err.message}`);
			reject();
		} else if (!res) {
			logger.error(`[${txnId}] Updating web hooks :: ${id} :: Notification Engine down!`);
			reject();
		} else {
			logger.info(`[${txnId}] Updating web hooks :: ${id} :: Done`);
			resolve();
		}
	}));
}

e.createDoc = (_req, _res) => {
	let txnId = _req.get('TxnId');
	try {
		let socket = _req.app.get('socket');
		if (_req.body.definition) {
			let idObject = _req.body.definition.find(def => def.key == '_id');
			idObject.counter = idObject && idObject.counter ? parseInt(idObject.counter, 10) : 0;
			idObject.padding = idObject && idObject.padding ? parseInt(idObject.padding, 10) : null;
			if (idObject.padding > 15) {
				return _res.status(400).json({
					'message': '_id length cannot be greater than 15'
				});
			}
			if (idObject.counter && idObject.padding && idObject.counter.toString().length > idObject.padding) {
				//padding(i.e. Length in UI ) must be greater than or equal to number of digits in counter (i.e. Start value in UI).
				return _res.status(400).json({
					'message': '_id counter is greater than length'
				});
			}
		}
		_req.body.version = 1;
		_req.body.api = _req.body.api ? _req.body.api.trim() : `/${_.camelCase(_req.body.name)}`;
		if (_req.body.api) {
			_req.body.api = _req.body.api.charAt(0) === '/' ? _req.body.api : '/' + _req.body.api;
		}
		// let role = _req.body.role;
		// delete _req.body.role;
		let serviceObj = null;
		return getNextPort()
			.then(port => _req.body.port = port)
			.then(() => smHooks.validateAppAndGetAppData(_req))
			.then(async (appData) => {
				if (!appData[0]) {
					_res.status(404).json({
						'message': `App data not found for ${_req.body.app}.`
					});
					throw new Error(`App data not found for ${_req.body.app}.`);
				}

				if (!('disableInsights' in _req.body)) {
					_req.body.disableInsights = appData[0].disableInsights;
				}

				if (!_req.body.connectors?.data) {
					_req.body.connectors = {
						data: {},
						file: {}
					};
				}

				if (!_req.body.connectors?.data?._id) {
					_req.body.connectors.data._id = appData[0].connectors.data._id;
				}
				if (!_req.body.connectors?.file?._id) {
					_req.body.connectors.file._id = appData[0].connectors.file._id;
				}

				return apiUniqueCheck(_req.body.api, _req.body.app);
			})
			.then(() => nameUniqueCheck(_req.body.name, _req.body.app))
			.then(() => {
				if (_req.body.definition) {
					return globalDefHelper.expandSchemaWithGlobalDef(_req.body.app, _req.body.definition);
				}
			})
			.then(expandedDef => {
				if (expandedDef) {
					_req.body.definition = expandedDef;
					return relationManager.checkRelationsAndCreate(_req.body, _req);
				} else {
					let model = mongoose.model('services');
					let doc = new model(_req.body);
					return doc.save(_req);
				}
			})
			.then(_d => {
				serviceObj = _d;
				serviceObj.headers = smhelper.generateHeadersForProperties(txnId, serviceObj.headers || []);
				return serviceObj;
			})
			.then(() => {
				return smHooks.createDSinMON(serviceObj, _req);
			})
			.then(() => {
				let _d = serviceObj;
				dataStackutils.eventsUtil.publishEvent('EVENT_DS_CREATE', 'dataService', _req, _d);
				_res.status(200).json(_d);
				deployUtil.sendToSocket(socket, 'newService', {
					_id: _d._id,
					app: _d.app,
					message: 'Entity has been created successfully.'
				});
				// deployUtil.deployService(_d, socket, _req, false, false);
				if (_d.webHooks && _d.workflowHooks && (_d.webHooks.length !== 0 || _d.workflowHooks.length !== 0)) {
					let data = {};
					data.service = _d._id;
					data.hookUrls = _d.webHooks;
					data.workflowHooks = _d.workflowHooks;
					data.entity = _d.name;
					createWebHooks(data, _req);
				}
			})
			.catch(_e => {
				logger.error(_e);
				if (serviceObj && serviceObj._id) {
					crudder.model.remove({
						_id: serviceObj._id
					})
						.then(_d => {
							logger.info('Removed service ' + _d._id + ' because of failure');
						});
				}
				if (!_res.headersSent) {
					_res.status(400).json({
						message: _e ? _e.message : 'Something Went Wrong'
					});
				}
			});
	} catch (e) {
		if (!_res.headersSent) {
			_res.status(400).json({
				message: e.message
			});
		}
		logger.error(e);
	}
};

/*
var oldJSON = {};
var newJSON = {};

function flattenJSON(_p, _d, _f) {
	for (var k in _d) {
		let path = (_p != '' ? _p + '.' : '') + k;
		if (typeof _d[k] == 'object') flattenJSON(path, _d[k], _f);
		else {
			if (_f) newJSON[path] = _d[k];
			else oldJSON[path] = _d[k];
		}
	}
}

function allowVersionChange(_o, _n) {
	for (var k in _o) {
		if (k.indexOf('required') == -1) {
			if (!_n.hasOwnProperty(k)) {
				logger.info('Change in schema detected');
				logger.info('path: ' + k, ', OLD Value : ' + _o[k], ', NEW Value : ' + _n[k]);
				return false;
			}
			if (_o[k] != _n[k]) {
				logger.info('Conflicting change in schema property');
				logger.info('path: ' + k, ', OLD Value : ' + _o[k], ', NEW Value : ' + _n[k]);
				return false;
			}
		}
	}
	return true;
}


function deepEqual(a, b) {
	if ((typeof a == "object" && a != null) && (typeof b == "object" && b != null)) {
		let count = [0, 0];
		for (let key in a) count[0]++;
		for (let key in b) count[1]++;
		if (count[0] - count[1] != 0) { return false; }
		for (let key in a)
			if (!(key in b) || !deepEqual(a[key], b[key])) return false;
		for (let key in b)
			if (!(key in a) || !deepEqual(b[key], a[key])) return false;
		return true;
	} else return a === b;
}
*/

function deepEqual(a, b) {
	return _.isEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
}

function validateCounterChange(isCounterChangeRequired, id, counter, app) {
	if (isCounterChangeRequired) {
		return getIdCounter(id, app)
			.then(_c => {
				if (_c) {
					if (counter <= _c) {
						throw new Error('id counter cannot be reduced');
					}
				}
				return Promise.resolve();
			});
	} else {
		return Promise.resolve();
	}
}

e.updateDoc = (_req, _res) => {
	let txnId = _req.get('TxnId');
	let ID = _req.params.id;
	logger.info(`[${txnId}] Update service request received for ${ID}`);

	delete _req.body.collectionName;
	delete _req.body.version;
	_req.body._id = ID;

	logger.trace(`[${txnId}] Payload received :: ${JSON.stringify(_req.body)}`);

	let promise = Promise.resolve();

	if (_req.body.schemaFree && _req.body.definition.length > 1) {
		let def = _.find(_req.body.definition, def => def.key == '_id');

		_req.body.definition = [def];
	}

	_req.body.headers = smhelper.generateHeadersForProperties(txnId, _req.body.headers || []);
	if (!_req.body.schemaFree && _req.body.definition) {
		promise = globalDefHelper.expandSchemaWithGlobalDef(_req.body.app, _req.body.definition);
	}

	return promise
		.then(expandedDef => {
			if (expandedDef) _req.body.definition = expandedDef;
		})
		.then(() => crudder.model.findOne({ _id: ID, app: _req.params.app, '_metadata.deleted': false }))
		.then(_d => {
			logger.trace(`[${txnId}] Document from DB for ${ID} :: ${JSON.stringify(_d)}`);

			let oldData = JSON.parse(JSON.stringify(_d));
			if (!_d) {
				logger.error(`[${txnId}] Document not found in DB`);
				return _res.status(404).json({
					message: 'Not found'
				});
			}

			if (_req.body.app && _req.body.app !== oldData.app) {
				logger.error(`[${txnId}] App change not permitted :: oldApp ${oldData.app} :: newApp ${_req.body.app}`);
				return _res.status(400).json({
					message: 'App change not permitted'
				});
			}

			let definitionComparison = true;
			if (!oldData.definition && _req.body.definition) definitionComparison = false;
			else if (oldData.definition && _req.body.definition) {
				definitionComparison = deepEqual(oldData.definition, _req.body.definition);
				if (!definitionComparison && oldData.type == 'internal' && !allowedChangeForCalendarDS(JSON.parse(JSON.stringify(oldData.definition)), JSON.parse(JSON.stringify(_req.body.definition)))) {
					logger.error('Changing definition is not allowed for calendar DS');
					return _res.status(400).json({
						message: 'Changing definition is not allowed for this DS.'
					});
				}
			}

			let isCounterChangeRequired = false;
			let oldIdElement = oldData.definition ? oldData.definition.find(d => d.key == '_id') : {};
			let newIdElement = _req.body.definition ? _req.body.definition.find(d => d.key == '_id') : {};
			let padding = newIdElement ? newIdElement.padding : null;
			if (!definitionComparison) {
				logger.debug('Definition has changed!');
				if ((padding != null) && padding > 15) {
					return _res.status(400).json({
						'message': '_id length cannot be greater than 15'
					});
				}
				if (oldIdElement && newIdElement && oldIdElement['padding'] > newIdElement['padding']) {
					_res.status(400).json({
						message: 'Decreasing _id\'s length in not allowed'
					});
					return;
				}
				if (oldIdElement && newIdElement && newIdElement['counter'] && oldIdElement['counter'] != newIdElement['counter'] && !_req.body?.connectors?.data?.options?.tableName) {
					isCounterChangeRequired = true;
				}
			}

			let srvcObj = null;
			return smHooks.validateAppAndGetAppData(_req)
				.then((appData) => {

					if (!_req.body.connectors?.data) {
						_req.body.connectors = {
							data: {},
							file: {}
						};
					}

					if (!_req.body.connectors?.data?._id) {
						_req.body.connectors.data._id = appData[0].connectors.data._id;
					}
					if (!_req.body.connectors?.file?._id) {
						_req.body.connectors.file._id = appData[0].connectors.file._id;
					}

					if (oldData.name != _req.body.name) {
						return nameUniqueCheck(_req.body.name, _req.body.app, ID);
					} else {
						return Promise.resolve();
					}
				})
				.then(() => {
					if (oldData.api && _req.body.api && oldData.api != _req.body.api) {
						return apiUniqueCheck(_req.body.api, _req.body.app, ID)
							.then(() => {
								if (oldData.relatedSchemas && oldData.relatedSchemas.incoming)
									return smhelper.canUpdateAPI(oldData.relatedSchemas.incoming);
								else
									return Promise.resolve();
							});
					} else {
						return Promise.resolve();
					}
				})
				.then(() => {
					if (_req.body.definition && !_req.body.schemaFree) return validateCounterChange(isCounterChangeRequired, ID, newIdElement['counter'], _req.body.app);
				})
				.then(() => {
					if (_d.status === 'Draft') {
						Object.assign(_d, _req.body);
						if (!definitionComparison) {
							logger.debug('Definition changed.');
							_d.definition = _req.body.definition;
						}
						return smHooks.updateServicesInGlobalSchema(_req.body, _req)
							.then(() => {
								if (oldData.definition) {
									return relationManager.checkRelationsAndUpdate(oldData, _d, _req);
								} else {
									return relationManager.getOutgoingRelationAndUpdate(_d, _req);
								}
							});
					} else if (_d.draftVersion) {
						return draftCrudder.model.findOne({ _id: ID, '_metadata.deleted': false })
							.then((newData) => {
								// _req.body.definition = JSON.stringify(_req.body.definition);
								newData = Object.assign(newData, _req.body);
								// _req.body.definition = JSON.parse(_req.body.definition);
								return relationManager.getOutgoingRelationAndUpdate(newData, _req);
							});
					} else {
						let model = draftCrudder.model;
						// _req.body.definition = JSON.stringify(_req.body.definition);
						let newData = new model(Object.assign({}, JSON.parse(JSON.stringify(oldData)), _req.body));
						//if (_req.body.definition) _req.body.definition = JSON.parse(_req.body.definition);
						newData.version = oldData.version + 1;
						_d.draftVersion = newData.version;
						logger.debug(JSON.stringify({ newData, _d }));
						return relationManager.getOutgoingRelationAndUpdate(newData, _req)
							.then(_n => _d.save(_req).then(() => _n));
					}
				})
				.then((_data) => {
					srvcObj = _data;
					_res.status(200).json(srvcObj);
				})
				.catch(err => {
					let message = 'Error in update doc';
					logger.error(err);
					logger.error(`[${txnId}] :: Error in validateAppAndGetAppData :: update doc :: `, err);
					if (err && err.message) {
						message = err.message;
					}
					if (!_res.headersSent) {
						_res.status(400).json({ message });
					}

				});
		})
		.catch(err => {
			logger.error(`[${txnId}] :: Error in update doc :: `, err);
			if (!_res.headersSent)
				_res.status(400).json({
					message: err.message
				});
			logger.error(err);
		});
};

/**
 * Compares definitions for calendar DS and allows only limited change
 * 
 * @param {*} oldDefinition 
 * @param {*} newDefinition 
 */

function allowedChangeForCalendarDS(oldDefinition, newDefinition) {
	if (oldDefinition.length != newDefinition.length) return false;
	for (var i = 0; i < oldDefinition.length; i++) {
		if (newDefinition[i].key == 'name' && oldDefinition[i].key == 'name') {
			delete newDefinition[i].properties.enum;
			delete oldDefinition[i].properties.enum;
		}
		delete newDefinition[i].properties.label;
		delete oldDefinition[i].properties.label;
	}
	return _.isEqual(oldDefinition, newDefinition);
	// let isAllowed = true;
	// _.forEach(oldDefinition, function (oldAttr) {
	// 	newAttr = newDefinition.find(nAttr => nAttr.key === oldAttr.key);
	// 	if(!newAttr) {
	// 		isAllowed = false;
	// 		return false;
	// 	}
	// 	if(newAttr.key == 'name' && oldAttr.key == 'name') {
	// 		delete newAttr.properties.enum;
	// 		delete oldAttr.properties.enum;
	// 	}
	// 	delete newAttr.properties.label;
	// 	delete oldAttr.properties.label;
	// 	if(!_.isEqual(oldAttr, newAttr)) {
	// 		isAllowed = false;
	// 		return false;
	// 	}
	// });
	// return isAllowed;
	// let keysToIgnore = [`name.properties.enum`, `name.properties.label`, `holidayName.properties.label`, `date.properties.label`];
	// return _.isEqual(_.omit(oldDefinition, keysToIgnore), _.omit(newDefinition, keysToIgnore));
}

/**
 * Detects changes in data services and return events accordingly
 * 
 * @param {*} oldData 
 * @param {*} newData 
 */

function getAllEventsForDSUpdate(oldData, newData) {
	let eventsList = [];
	if (oldData.name != newData.name) eventsList.push('EVENT_DS_UPDATE_NAME');
	if (oldData.api != newData.api) eventsList.push('EVENT_DS_UPDATE_API');
	if (!deepEqual(oldData.versionValidity, newData.versionValidity)) eventsList.push('EVENT_DS_UPDATE_HISTORY');
	if (!deepEqual(oldData.webHooks, newData.webHooks)) eventsList.push('EVENT_DS_UPDATE_POSTHOOK');
	if (!deepEqual(oldData.preHooks, newData.preHooks)) eventsList.push('EVENT_DS_UPDATE_PREHOOK');
	if (!deepEqual(oldData.workflowHooks, newData.workflowHooks)) eventsList.push('EVENT_DS_UPDATE_WORKFLOWHOOK');
	if (!deepEqual(oldData.headers, newData.headers)) eventsList.push('EVENT_DS_UPDATE_HEADERS');
	if (oldData.role && newData.role && !deepEqual(oldData.role.roles, newData.role.roles)) eventsList.push('EVENT_DS_UPDATE_ROLE');
	if (oldData.enableSearchIndex != newData.enableSearchIndex) eventsList.push('EVENT_DS_UPDATE_FUZZYSEARCH');
	oldData.wizard.forEach(wz => delete wz._id);
	let newWizard = JSON.parse(JSON.stringify(newData.wizard));
	newWizard.forEach(wz => delete wz._id);
	if (!deepEqual(oldData.wizard, newWizard)) eventsList.push('EVENT_DS_UPDATE_EXPERIENCE');
	if ((!oldData.definition && newData.definition) ||
		(oldData.definition && newData.definition && !deepEqual(oldData.definition, newData.definition)))
		eventsList.push('EVENT_DS_UPDATE_DEFINITION');
	return eventsList;
}

function rollBackDeploy(id, req) {
	return draftCrudder.model.findOne({ _id: id })
		.then(_d => {
			if (_d) {
				return crudder.model.findOne({ _id: id });
			}
		})
		.then(_d => {
			if (_d) {
				_d.draftVersion = _d.version + 1;
				return _d.save(req);
			}
		})
		.catch(err => {
			logger.error(err);
		});
}

e.deployAPIHandler = (_req, _res) => {
	let txnId = _req.get('TxnId');
	let ID = _req.params.id;
	let app = _req.params.app;
	logger.info(`[${txnId}] Service deploy request received for service ${ID}`);

	let socket = _req.app.get('socket');
	// let user = _req.get('User');
	// let isSuperAdmin = _req.get('isSuperAdmin') ? JSON.parse(_req.get('isSuperAdmin')) : false;
	let isReDeploymentRequired = false;
	let preHookUpdated = false;
	let isWebHookUpdateRequired = false;
	let isWizardUpdateRequired = false;
	let isDeleteAndCreateRequired = false;
	let isAuditIndexDeleteRequired = false;
	let isApiEndpointChanged = false;
	let removeSoftDeletedRecords = false;
	let isWorkflowChanged = false;
	let isStateModelChanged = false;

	return crudder.model.findOne({ _id: ID, app: app, '_metadata.deleted': false })
		.then(_d => {
			if (!_d) {
				logger.debug(`[${txnId}] No data found in DB for service ${ID} in app ${app}`);
				_res.status(404).json({ message: 'Service not found' });
			} else {
				logger.debug(`[${txnId}] Old data found in DB for service ${ID}`);
				logger.trace(`[${txnId}] Old data from DB :: ${JSON.stringify(_d)}`);
				logger.debug(`[${txnId}] Service status ${ID} :: ${_d.status}`);

				let oldData = JSON.parse(JSON.stringify(_d));
				if (_d.status != 'Draft' && !_d.draftVersion) {
					logger.error(`[${txnId}] No draft data found for service ${ID}`);
					throw new Error('Draft not available for this data service');
				}
				if (_d.status === 'Draft') {
					let svcObject = _d.toObject();
					// if (envConfig.verifyDeploymentUser && !isSuperAdmin && svcObject && svcObject._metadata && svcObject._metadata.lastUpdatedBy == user) {
					// 	logger.error(`[${txnId}] User cannot deploy own changes for service ${ID} status ${svcObject.status}`);
					// 	return _res.status(403).json({ message: 'You can\'t deploy your own changes.' });
					// }
					if (!svcObject.schemaFree && (!svcObject.definition || svcObject.definition.length == 1)) {
						logger.error(`[${txnId}] Definition not found for service ${ID}`);
						throw new Error('Data service definition not found.');
					}
					if (!svcObject.versionValidity) {
						logger.error(`[${txnId}] Data settings not configured for service ${ID}`);
						throw new Error('Data settings are not configured for the data service.');
					}

					let promise = Promise.resolve();

					return promise
						.then(() => { if (!svcObject.schemaFree) relationManager.checkRelationsAndUpdate(oldData, _d, _req); })
						.then(async (doc) => {
							let relatedEntities = [];

							if (doc?.relatedSchemas?.outgoing && !_.isEmpty(doc.relatedSchemas.outgoing)) {
								let extServices = doc.relatedSchemas.outgoing.map(obj => obj.service);
								extServices = _.uniq(extServices);

								let docs = await crudder.model.find({ _id: { $in: extServices } }, '_id status name').lean();

								docs.forEach(docObj => {
									if (docObj.status == 'Undeployed') {
										relatedEntities.push(docObj._id);
									}
								});
							}

							if (relatedEntities.length > 0) {
								let promises = await relatedEntities.reduce(async (prev, entity) => {
									await prev;
									return await startService(_req, null, entity, relatedEntities);
								}, Promise.resolve());

								return await promises;
							}
						})
						.then(() => {
							let newHooks = {
								'webHooks': svcObject.webHooks,
								'workflowHooks': svcObject.workflowHooks
							};
							return updateWebHook(ID, newHooks, _req);
						})
						.then(() => deployUtil.deployService(svcObject, socket, _req, false))
						.then(() => {
							logger.info(`[${txnId}] Deployment process started for service ${ID} status ${svcObject.status}`);
							dataStackutils.eventsUtil.publishEvent('EVENT_DS_DEPLOYMENT_QUEUED', 'dataService', _req, _d);
							_res.status(202).json({ message: 'Deployment process started' });
						});
				} else {
					return draftCrudder.model.findOne({ _id: ID, '_metadata.deleted': false })
						.then(data => {
							let newData = JSON.parse(JSON.stringify(data.toObject()));
							// if (envConfig.verifyDeploymentUser && !isSuperAdmin && newData && newData._metadata && newData._metadata.lastUpdatedBy == user) {
							// 	logger.error(`[${txnId}] User cannot deploy own changes for service ${ID} status ${newData.status}`);
							// 	return _res.status(403).json({ message: 'You can\'t deploy your own changes.' });
							// }

							if (newData.webHooks.length || newData.workflowHooks) {
								logger.trace(`[${txnId}] Webhooks updated for service ${ID}`);
								isWebHookUpdateRequired = true;
							}

							if (oldData.api != newData.api) {
								logger.trace(`[${txnId}] API changed for service ${ID} :: oldAPI ${oldData.api} :: newAPI ${newData.api}`);
								isApiEndpointChanged = true;
								isDeleteAndCreateRequired = true;
								isReDeploymentRequired = true;
							}

							if (oldData.enableSearchIndex != newData.enableSearchIndex) {
								logger.trace(`[${txnId}] Enable Search Index option changed for service ${ID}`);
								isReDeploymentRequired = true;
							}

							if (newData.app && newData.app !== oldData.app) {
								logger.error(`[${txnId}] App change not permitted :: oldApp ${oldData.app} :: newApp ${_req.body.app}`);
								return _res.status(400).json({ message: 'App change not permitted' });
							}

							if (oldData.name != newData.name) {
								logger.trace(`[${txnId}] Service name changed for service ${ID} :: oldName ${oldData.name} :: newName ${newData.name}`);
								isReDeploymentRequired = true;
							}

							if (oldData.disableInsights != newData.disableInsights) {
								logger.trace(`[${txnId}] Disbale Insights changed for service ${ID}`);
								isReDeploymentRequired = true;
							}

							if (oldData.permanentDeleteData != newData.permanentDeleteData) {
								logger.trace(`[${txnId}] Permanent Delete changed for service ${ID}`);
								isReDeploymentRequired = true;
							}

							removeSoftDeletedRecords = !oldData.permanentDeleteData && newData.permanentDeleteData;

							logger.trace(`[${txnId}] OldWizard :: ${JSON.stringify(oldData.wizard)}`);
							logger.trace(`[${txnId}] NewWizard :: ${JSON.stringify(newData.wizard)}`);

							if (!_.isEqual(JSON.parse(JSON.stringify(oldData.wizard)), JSON.parse(JSON.stringify(newData.wizard)))) {
								logger.trace(`[${txnId}] Wizard Updated for service ${ID}`);
								isWizardUpdateRequired = true;
							}

							if (newData.versionValidity && oldData.versionValidity.validityType != newData.versionValidity.validityType) {
								logger.trace(`[${txnId}] Verson validity type changed for service ${ID}`);
								isReDeploymentRequired = true;
								isAuditIndexDeleteRequired = true;
							}

							if (!_.isEqual(JSON.parse(JSON.stringify(oldData.preHooks)), newData.preHooks) || (newData.experienceHooks && !_.isEqual(JSON.parse(JSON.stringify(oldData.experienceHooks)), newData.experienceHooks))) {
								logger.trace(`[${txnId}] Pre-hooks OR Experience-hooks changed for service ${ID}`);
								preHookUpdated = true;
							}

							if (newData.versionValidity && oldData.versionValidity.validityValue != newData.versionValidity.validityValue) {
								logger.trace(`[${txnId}] Verson validity value changed for service ${ID}`);
								isReDeploymentRequired = true;
								isAuditIndexDeleteRequired = true;
							}

							let newDefinition = newData.definition;
							let definitionComparison;
							let isCounterChangeRequired = false;
							let oldIdElement;
							let newIdElement;
							let padding;

							if (!oldData.schemaFree && newData.schemaFree) {
								logger.trace(`[${txnId}] Service type changed to schema free for service ${ID}`);
								isReDeploymentRequired = true;
							} else {
								definitionComparison = deepEqual(oldData.definition, newData.definition);
								oldIdElement = oldData.definition ? oldData.definition.find(d => d.key == '_id') : {};
								newIdElement = newData.definition ? newData.definition.find(d => d.key == '_id') : {};
								padding = newIdElement ? newIdElement.padding : null;

								if (newData.schemaFree && oldData.definition) {
									isReDeploymentRequired = true;
								} else if (!definitionComparison) {
									logger.debug(`[${txnId}] Deploy API handler :: ${ID} :: Definition changed`);
									if (padding > 15) {
										logger.error(`[${txnId}] Deploy API handler :: ${ID} :: _id length cannot be greater than 15.`);
										return _res.status(400).json({ 'message': '_id length cannot be greater than 15' });
									}
									if (oldIdElement['padding'] > newIdElement['padding']) {
										logger.error(`[${txnId}] Deploy API handler :: ${ID} :: _id length cannot be decreased.`);
										logger.error(`[${txnId}] Deploy API handler :: ${ID} :: old (${oldIdElement['padding']} new ${newIdElement['padding']})`);
										return _res.status(400).json({ message: 'Decreasing _id\'s length in not allowed' });
									}
									if (newIdElement['counter'] && oldIdElement['counter'] != newIdElement['counter']) isCounterChangeRequired = true;
									isReDeploymentRequired = true;
								}
							}
							if (oldData.workflowConfig && newData.workflowConfig) {
								let workflowComparison = deepEqual(oldData.workflowConfig, newData.workflowConfig);
								if (!workflowComparison) {
									isWorkflowChanged = true;
									isReDeploymentRequired = true;
								}
							}

							let oldModel = oldData.stateModel ? JSON.parse(JSON.stringify(oldData.stateModel)) : {};
							let newModel = newData.stateModel ? JSON.parse(JSON.stringify(newData.stateModel)) : {};
							delete oldModel.enabled;
							delete newModel.enabled;
							delete oldModel._id;
							delete newModel._id;
							let stateModelComparison = deepEqual(oldModel, newModel);
							if (!stateModelComparison) {
								isStateModelChanged = true;
								isReDeploymentRequired = true;
							}

							if (isReDeploymentRequired || preHookUpdated || isWizardUpdateRequired) newData.version = _d.version + 1;

							logger.info(`[${txnId}] Redeployment required for service ${ID}? ${isReDeploymentRequired ? 'YES' : 'NO'}`);
							logger.info(`[${txnId}] Webhook save required for service ${ID}? ${isWebHookUpdateRequired ? 'YES' : 'NO'}`);
							logger.info(`[${txnId}] Clean redeploy for service ${ID}? ${isDeleteAndCreateRequired ? 'YES' : 'NO'}`);
							logger.info(`[${txnId}] Audit index delete required for service ${ID}? ${isAuditIndexDeleteRequired ? 'YES' : 'NO'}`);

							let srvcObj = JSON.parse(JSON.stringify(newData));
							delete srvcObj.__v;
							Object.assign(_d, srvcObj);
							_d.draftVersion = null;
							_d.isWorkflowChanged = isWorkflowChanged;
							_d.isStateModelChanged = isStateModelChanged;
							_d.oldModel = oldModel;
							if (!definitionComparison) _d.definition = newDefinition;

							let promise = Promise.resolve();
							if (oldData.name != newData.name) {
								logger.debug(`[${txnId}] Checking if new service name is unique for service ${ID}`);
								promise = nameUniqueCheck(newData.name, newData.app, ID);
							}

							return promise
								.then(() => {
									if (isApiEndpointChanged) {
										logger.debug(`[${txnId}] Checking if new api endpoint is unique for service ${ID}`);
										return apiUniqueCheck(newData.api, newData.app, ID);
									}
									return Promise.resolve();
								})
								.then(() => {
									if (!newData.schemaFree && newDefinition) {
										logger.debug(`[${txnId}] Validating id counter change for service ${ID}`);
										return validateCounterChange(isCounterChangeRequired, ID, newIdElement['counter'], newData.app);
									}
									return Promise.resolve();
								})
								.then(() => relationManager.checkRelationsAndUpdate(oldData, _d, _req))
								.then(async (doc) => {

									let relatedEntities = [];

									if (doc?.relatedSchemas?.outgoing && !_.isEmpty(doc.relatedSchemas.outgoing)) {
										let extServices = doc.relatedSchemas.outgoing.map(obj => obj.service);
										extServices = _.uniq(extServices);

										let docs = await crudder.model.find({ _id: { $in: extServices } }, '_id status name').lean();

										docs.forEach(docObj => {
											if (docObj.status == 'Undeployed') {
												relatedEntities.push(docObj._id);
											}
										});
									}

									if (relatedEntities.length > 0) {
										let promises = await relatedEntities.reduce(async (prev, entity) => {
											await prev;
											return await startService(_req, null, entity, relatedEntities);
										}, Promise.resolve());

										return await promises;
									}
								})
								// .then(() => {
								// 		// if (!definitionComparison) {
								// 		// 	return deployUtil.updateInPM(srvcObj._id, _req);
								// 		// }
								// 	})
								.then(() => {
									return data.remove(_req);
								})
								.then(async () => {
									dataStackutils.eventsUtil.publishEvent('EVENT_DS_DEPLOYMENT_QUEUED', 'dataService', _req, _d);
									_res.status(202).json({ message: 'Deployment process started' });
									if (!envConfig.isCosmosDB() && srvcObj.collectionName != oldData.collectionName) {
										isReDeploymentRequired = true;
										if (envConfig.isK8sEnv()) {
											await k8s.deploymentDelete(_req.get('TxnId'), oldData);
											logger.info(`[${_req.get('TxnId')}] Deployment delete request queued for ${oldData._id}`);
											await k8s.serviceDelete(_req.get('TxnId'), oldData);
											logger.info(`[${_req.get('TxnId')}] Service delete request queued for ${oldData._id}`);
										} else {
											logger.info(`[${_req.get('TxnId')}] PM2 not supported`);
										}
										await renameCollections(oldData.collectionName, srvcObj.collectionName, `${process.env.DATA_STACK_NAMESPACE}-${srvcObj.app}`);
										return;
									}
								})
								.then(() => smHooks.updateServicesInGlobalSchema(srvcObj, _req))
								.then(() => {
									return smHooks.updateExpiry(srvcObj, _req, oldData.collectionName, srvcObj.collectionName);
								})
								.then(() => logger.info('Service details for ' + _d._id + ' under app ' + _d.app + ' has been saved!'))
								.then(() => {
									if (isCounterChangeRequired) {
										logger.info(`[${txnId}] Deploy API handler :: ${ID} :: Counter change required? ${isCounterChangeRequired ? 'YES' : 'NO'}`);
										logger.debug(`[${txnId}] Deploy API handler :: ${ID} :: DB :: ${`${process.env.DATA_STACK_NAMESPACE}-${srvcObj.app}`}`);
										return global.mongoConnection.db(`${process.env.DATA_STACK_NAMESPACE}-${srvcObj.app}`).collection('counters')
											.update({ _id: oldData.collectionName }, { next: parseInt(newIdElement['counter'], 10) - 1 });
									}
								})
								.then(_e => {
									if (_e) logger.info('counter for ' + oldData._id + ' updated successfully');
									let newHooks = { 'webHooks': newData.webHooks, 'workflowHooks': newData.workflowHooks };
									if (isWebHookUpdateRequired) return updateWebHook(ID, newHooks, _req);
								})
								.then(() => {
									if (isApiEndpointChanged && srvcObj.relatedSchemas && srvcObj.relatedSchemas.incoming) {
										return expandRelationHelper.updateHrefInDS(ID, srvcObj.app, srvcObj.api, srvcObj.relatedSchemas.incoming, _req);
									}
								})
								.then(() => {
									logger.info(`[${txnId}] Deploy API handler :: ${ID} :: Redeployment required? ${isReDeploymentRequired ? 'YES' : 'NO'}`);
									logger.info(`[${txnId}] Deploy API handler :: ${ID} :: Pre-hook updated? ${preHookUpdated ? 'YES' : 'NO'}`);
									logger.info(`[${txnId}] Deploy API handler :: ${ID} :: Wizard updated? ${isWizardUpdateRequired ? 'YES' : 'NO'}`);
									logger.info(`[${txnId}] Deploy API handler :: ${ID} :: Purge soft deleted records? ${removeSoftDeletedRecords ? 'YES' : 'NO'}`);
									if (isReDeploymentRequired || preHookUpdated || isWizardUpdateRequired) {
										logger.info(`[${txnId}] Deploy API handler :: ${ID} :: Redeploying under app ${_d.app}`);
										logger.trace(`[${txnId}] Deploy API handler :: ${JSON.stringify(_d)}`);
										var data = JSON.parse(JSON.stringify(_d));
										let mongoDBVishnu = global.mongoConnection.db(`${process.env.DATA_STACK_NAMESPACE}-${srvcObj.app}`);
										logger.info(`[${txnId}] Deploy API handler :: ${ID} :: Reindexing the collection :: ${data.collectionName}`);
										let promise = Promise.resolve();
										if (removeSoftDeletedRecords) {
											promise = mongoDBVishnu.dropCollection(data.collectionName + '.deleted');
										}
										return promise.then(() => mongoDBVishnu.collection(data.collectionName).dropIndexes())
											.catch(err => {
												logger.error(`[${txnId}] Deploy API handler :: ${ID} :: Reindexing: ${err.message}`);
												return Promise.resolve(err);
											})
											.then(_d => {
												logger.debug(`[${txnId}] Deploy API handler :: ${ID} :: Result of reindexing: ${JSON.stringify(_d)}`);
												return deployUtil.deployService(data, socket, _req, oldData ? isReDeploymentRequired : false);
											})
											.then(_d => {
												logger.debug(`[${txnId}] Deploy API handler :: ${ID} :: Response from deployService :: ${JSON.stringify(_d)}`);
											});
									}
								})
								.then(() => {
									let eventsList = getAllEventsForDSUpdate(oldData, newData);
									eventsList.forEach(event => dataStackutils.eventsUtil.publishEvent(event, 'dataService', _req, newData));
								})
								.catch(err => {
									logger.debug('Inside catch');
									if (!_res.headersSent)
										_res.status(400).json({ message: err.message });
									logger.error(err);
									return rollBackDeploy(ID, _req);
								});
						})
						.catch(err => {
							logger.debug('Inside catch');
							if (!_res.headersSent)
								_res.status(400).json({
									message: err.message
								});
							logger.error(err);
							return rollBackDeploy(ID, _req);
						});
				}
			}
		})
		.catch(err => {
			logger.trace(`[${txnId}] Inside catch`);
			if (!_res.headersSent) _res.status(400).json({ message: err.message });
			logger.error(`[${txnId}] Error deploying data service :: ${err.message}`);
		});
};

e.startAPIHandler = (_req, _res) => {
	let id = _req.params.id;

	startService(_req, _res, id, []);
};


async function startService(req, res, id, list) {
	let txnId = req.get('TxnId');
	try {
		let socket = req.app.get('socket');

		let doc = await crudder.model.findOne({ _id: id, app: req.params.app, '_metadata.deleted': false, 'type': { '$nin': ['internal'] } });

		if (doc && !doc?.schemaFree && doc?.definition?.length == 1) {
			throw new Error('Data service definition not found.');
		}
		if (doc) {
			if (res && !res?.headersSent) res.status(202).json({ message: 'Entity has been saved successfully' });

			doc = doc.toObject();
			list.push(id);
			list = _.uniq(list);
			let relatedEntities = [];

			if (doc.relatedSchemas.outgoing && !_.isEmpty(doc.relatedSchemas.outgoing)) {
				let extService = doc.relatedSchemas.outgoing.map(obj => obj.service);
				extService = _.uniq(extService);

				let docs = await crudder.model.find({ _id: { $in: extService } }, '_id status name').lean();

				docs.forEach(docObj => {
					if (docObj.status == 'Undeployed') {
						relatedEntities.push(docObj._id);
					}
				});
			}

			relatedEntities = _.difference(relatedEntities, list);
			if (relatedEntities.length > 0) {
				let promises = await relatedEntities.reduce(async (prev, entity) => {
					await prev;
					return await startService(req, res, entity, relatedEntities.concat(list));
				}, Promise.resolve());

				await promises;
			}

			const ns = envConfig.dataStackNS + '-' + doc.app.toLowerCase().replace(/ /g, '');
			if (process.env.SM_ENV == 'K8s') {
				let instances = doc.instances ? doc.instances : 1;
				logger.info(`[${txnId}] Data service start :: ${id} ::Scaling to ${instances}`);
				return kubeutil.deployment.scaleDeployment(ns, doc.api.split('/')[1].toLowerCase(), instances)
					.then(_d => {
						logger.debug(`[${txnId}] Scale deployment response : ${JSON.stringify(_d)}`);
						if (_d.statusCode == 404) {
							return k8s.serviceStart(doc)
								.then(() => deployUtil.deployService(doc, socket, req, false))
								.then(() => dataStackutils.eventsUtil.publishEvent('EVENT_DS_START', 'dataService', req, doc));
						} else {
							dataStackutils.eventsUtil.publishEvent('EVENT_DS_START', 'dataService', req, doc);
						}
					})
					.catch(err => {
						logger.error(err);
					});
			}
			return deployUtil.deployService(doc, socket, req, false)
				.then(() => dataStackutils.eventsUtil.publishEvent('EVENT_DS_START', 'dataService', req, doc));

		} else {
			throw new Error('No service found with given id');
		}
	} catch (err) {
		logger.error(`[${txnId}] Data service start error ${id} :: ${err.message}`);
		if (!res.headersSent) res.status(500).json({ message: err.message });
	}
}

e.stopAPIHandler = async (_req, _res) => {
	let txnId = _req.get('TxnId');
	let id = _req.params.id;
	let socket = _req.app.get('socket');
	let instances = null;

	try {
		let doc = await crudder.model.findOne({ _id: id, app: _req.params.app, '_metadata.deleted': false, 'type': { '$nin': ['internal'] } });

		if (!doc) {
			throw new Error('No service found with given id');
		} else {
			checkIncomingRelation(id, _req.params.app)
				.then(() => {
					_res.status(202).json({
						message: `Deployment termination request accepted for service ${id}.`
					});
				}, (data) => {
					let serviceMsg = '';
					if (data.relatedEntities.length == 1) {
						serviceMsg = 'Data Service: ' + data.relatedEntities[0];
					} else if (data.relatedEntities.length == 2) {
						serviceMsg = 'Data Services: ' + data.relatedEntities[0] + ' & ' + data.relatedEntities[1];
					} else {
						serviceMsg = 'Data Services: ' + data.relatedEntities[0] + ',' + data.relatedEntities[1] + ' & ' + 'more';
					}

					_res.status(400).json({
						message: 'Data Service ' + data.name + ' cannot be stopped as it is being used by the following ' + serviceMsg + '. Try again after stopping/delinking from the related Data Services.'
					});
					throw new Error('Data Service ' + data.name + ' cannot be stopped as it is being used by the following ' + serviceMsg + '. Try again after stopping/delinking from the related Data Services.');
				})
				.then(() => {
					if (process.env.SM_ENV == 'K8s') {
						logger.info(`[${txnId}][${id}] Scaling down k8s deployment to 0.`);
						return crudder.model.findOne({
							_id: id,
							'type': { '$nin': ['internal'] }
						})
							.then(_d => {
								if (!_d) throw new Error('No service found with given id');
								const ns = envConfig.dataStackNS + '-' + _d.app.toLowerCase().replace(/ /g, '');
								return kubeutil.deployment.scaleDeployment(ns, _d.api.split('/')[1].toLowerCase(), 0);
							})
							.then(_d => {
								instances = _d && _d.status && _d.status.replicas ? _d.status.replicas : null;
								logger.info('Instances at time of undeploying ' + instances);
								if (instances) {
									return crudder.model.findOne({
										_id: id
									});
								}
							})
							.then(_d => {
								if (_d && instances) {
									_d.instances = instances;
									return _d.save(_req);
								}
							})
							.catch(err => {
								logger.error(err);
							});
					} else logger.info(`[${txnId}][${id}] Can't stop service. Not running on kubernetes.`);
				})
				.then(() => {
					return deployUtil.updateDocument(crudder.model, {
						_id: id
					}, {
						status: 'Undeployed'
					}, _req);
				})
				.then((doc) => {
					dataStackutils.eventsUtil.publishEvent('EVENT_DS_STOP', 'dataService', _req, doc);
					deployUtil.sendToSocket(socket, 'serviceStatus', {
						_id: id,
						app: doc.app,
						message: 'Undeployed'
					});
				})
				.catch(err => {
					logger.error(err);
					if (!_res.headersSent)
						_res.status(500).send(err.message);
				});
		}
	} catch (err) {
		logger.error(`[${txnId}] Data service start error ${id} :: ${err.message}`);
		if (!_res.headersSent) _res.status(500).json({ message: err.message });
	}
};

function destroyDeployment(id, count, _req) {
	logger.info(`[${_req.get('TxnId')}] Destroy attempt no: ${count}`);
	return deployUtil.updateDocument(crudder.model, { _id: id }, { status: 'Pending' }, _req)
		.then(_d => {
			if (envConfig.isK8sEnv()) {
				return k8s.deploymentDelete(_req.get('TxnId'), _d)
					.then(() => logger.info(`[${_req.get('TxnId')}] Deployment delete request queued for ${_d._id}`))
					.then(() => k8s.serviceDelete(_req.get('TxnId'), _d))
					.then(() => {
						logger.info(`[${_req.get('TxnId')}] Service delete request queued for ${_d._id}`);
						return _d;
					})
					.catch(_e => logger.error(`[${_req.get('TxnId')}] ${_e.message}`));
			} else {
				logger.info(`[${_req.get('TxnId')}] PM2 not supported`);
				return _d;
			}
		})
		.catch(err => {
			deployUtil.updateDocument(crudder.model, { _id: id }, { comment: err.message }, _req)
				.then(() => {
					if (count >= destroyDeploymentRetry) throw err;
				})
				.then(() => destroyDeployment(id, count + 1, _req))
				.catch(e => logger.error(`[${_req.get('TxnId')}] ${e.message}`));
		});
}

async function renameCollections(oldColl, newColl, app) {
	try {
		const mongoDBAppcenter = global.mongoConnection.db(app);
		if (mongoDBAppcenter) {
			await mongoDBAppcenter.collection(oldColl).rename(newColl);
			logger.info('Collection name changed from ' + oldColl + ' to ' + newColl);
			const doc = await mongoDBAppcenter.collection('counters').findOne({ _id: oldColl });
			if (doc) {
				const newObj = JSON.parse(JSON.stringify(doc));
				newObj._id = newColl;
				await mongoDBAppcenter.collection('counters').insert(newObj);
				logger.info('Added counter for ' + newColl);
				await mongoDBAppcenter.collection('counters').remove({ _id: oldColl });
				logger.info('Removed counter for ' + oldColl);
			}
			await mongoDBAppcenter.collection(oldColl + '.bulkCreate').rename(newColl + '.bulkCreate');
			logger.info('Collection name changed from ' + oldColl + '.bulkCreate' + ' to ' + newColl + '.bulkCreate');
			await mongoDBAppcenter.collection(oldColl + '.dedupe').rename(newColl + '.dedupe');
			logger.info('Collection name changed from ' + oldColl + '.dedupe' + ' to ' + newColl + '.dedupe');
			await mongoDBAppcenter.collection(oldColl + '.exports').rename(newColl + '.exports');
			logger.info('Collection name changed from ' + oldColl + '.exports' + ' to ' + newColl + '.exports');
			await mongoDBAppcenter.collection(oldColl + '.fileImport.chunks').rename(newColl + '.fileImport.chunks');
			logger.info('Collection name changed from ' + oldColl + '.fileImport.chunks' + ' to ' + newColl + '.fileImport.chunks');
			await mongoDBAppcenter.collection(oldColl + '.fileImport.files').rename(newColl + '.fileImport.files');
			logger.info('Collection name changed from ' + oldColl + '.fileImport.files' + ' to ' + newColl + '.fileImport.files');
			await mongoDBAppcenter.collection(oldColl + '.fileTransfers').rename(newColl + '.fileTransfers');
			logger.info('Collection name changed from ' + oldColl + '.fileTransfers' + ' to ' + newColl + '.fileTransfers');
			await mongoDBAppcenter.collection(oldColl + '.workflow').rename(newColl + '.workflow');
			logger.info('Collection name changed from ' + oldColl + '.workflow' + ' to ' + newColl + '.workflow');
		}
	} catch (err) {
		logger.error(err.message);
		throw err;
	}
}

function dropCollections(collectionName, app, txnId, appName) {
	logger.debug(`[${txnId}] DropCollection :: DB clean up : ${app}`);
	let appCenterDB = global.mongoConnection.db(app);
	logger.error(`[${txnId}] DropCollection :: AppCenter DB Connection ${appCenterDB ? 'Active' : 'Inactive'}`);
	if (appCenterDB) {
		logger.debug(`[${txnId}] DropCollection :: DB clean up drop collection : ${collectionName}`);
		appCenterDB.dropCollection(collectionName, (err, coll) => {
			if (err) logger.error(`[${txnId}] DropCollection :: ${collectionName} :: ${err.message}`);
			else if (coll) logger.info(`[${txnId}] DropCollection :: Collection ${collectionName} deleted successfully`);
		});
		let sufix = ['.bulkCreate', '.exportedFile.chunks', '.exportedFile.files', '.fileImport.chunks', '.fileImport.files', '.fileTransfers', '.files', '.chunks', '.workflow', '.dedupe', '.exports'];
		sufix.forEach(_s => {
			let colName = collectionName + _s;
			logger.debug(`[${txnId}] DropCollection :: DB clean up drop collection : ${colName}`);
			appCenterDB.dropCollection(colName, (err, coll) => {
				if (err) logger.error(`[${txnId}] DropCollection :: ${colName} :: ${err.message}`);
				if (coll) logger.info(`[${txnId}] DropCollection :: Collection ${colName} deleted successfully`);
			});
		});
		appCenterDB.collection('counters').remove({ _id: collectionName }, function (err) {
			if (err) logger.error(`[${txnId}] DropCollection :: counter :: ${collectionName} :: ${err.message}`);
			else logger.info(`[${txnId}] DropCollection :: Counter ${collectionName} deleted successfully`);
		});

		let logsDB = global.mongoConnection.db(envConfig.mongoLogsOptions.dbName);
		logger.error(`[${txnId}] DropCollection :: Logs DB Connection ${logsDB ? 'Active' : 'Inactive'}`);
		if (logsDB) {
			logger.debug(`[${txnId}] DropCollection :: DB clean up drop collection : ${appName}.${collectionName}.audit`);
			logsDB.dropCollection(`${appName}.${collectionName}.audit`, (err, coll) => {
				if (err) logger.error(`[${txnId}] DropCollection :: ${appName}.${collectionName}.audit :: ${err.message}`);
				else if (coll) logger.info(`[${txnId}] DropCollection :: Collection ${appName}.${collectionName}.audit deleted successfully`);
			});
		}
	}
}

e.destroyService = (_req, _res) => {
	let id = _req.params.id;
	let app = _req.params.app;
	let socket = _req.app.get('socket');
	let originalDoc = {};
	let txnId = _req.get('TxnId');
	logger.info(`[${txnId}] Deleting the service : ${id}`);
	logger.debug(`[${txnId}] Socket status : ${socket ? 'Active' : 'Inactive'}`);

	// return smhelper.getFlows(id, _req)
	return Promise.resolve([]).then(_flows => {
		logger.debug(`[${txnId}] ${JSON.stringify({ _flows })}`);
		if (_flows.length > 0) {
			_res.status(400).json({ message: 'Data service is in use by flow ' + _flows.map(_f => _f.name) });
			logger.info(`[${txnId}] Data service in use by flows`);
			throw new Error('Data service in use by flows');
		} else {
			return checkIncomingRelation(id, app);
		}
	})
		.then((doc) => {
			logger.debug(`[${txnId}] Delete data service ${id} has 0 incoming relationships`);
			logger.debug(`[${txnId}] Delete data service :: ID :: ${doc?._id}`);
			logger.debug(`[${txnId}] Delete data service :: Type :: ${doc?.type}`);
			logger.debug(`[${txnId}] Delete data service :: Status :: ${doc?.status}`);
			logger.debug(`[${txnId}] Delete data service :: App :: ${doc?.app}`);
			logger.debug(`[${txnId}] Delete data service :: Version :: ${doc?.version}`);
			logger.debug(`[${txnId}] Delete data service :: Perm. del. data :: ${doc?.permanentDeleteData}`);
			if (doc && doc.type != 'internal') {
				originalDoc = JSON.parse(JSON.stringify(doc));
				crudder.model.findOneAndUpdate({ _id: originalDoc._id }, { status: 'Pending' })
					.then(() => logger.info(`[${txnId}] Undeploying data service ${doc._id}`))
					.then(() => _res.status(202).json({ message: 'Undeploying data service ...' }))
					.catch(err => {
						_res.status(500).json({ message: err.message });
					});
			} else if (doc && doc.type == 'internal') {
				logger.error(`[${txnId}] ${doc._id} type is ${doc.type}. Not allowed to delete`);
				_res.status(400).json({ message: 'Can not delete this Service' });
				throw new Error('Can not delete this Service');
			} else {
				logger.error(`[${txnId}] Service not found`);
				_res.status(404).json({ message: 'Service not found' });
				throw new Error('Service not found');
			}
		}, (data) => {
			logger.debug(`[${txnId}] Delete data service ${id} has ${data.relatedEntities.length} relationships`);
			let serviceMsg = '';
			if (data.relatedEntities.length == 1) serviceMsg = 'Data Service: ' + data.relatedEntities[0];
			else if (data.relatedEntities.length == 2) serviceMsg = 'Data Services: ' + data.relatedEntities[0] + ' & ' + data.relatedEntities[1];
			else serviceMsg = 'Data Services: ' + data.relatedEntities[0] + ',' + data.relatedEntities[1] + ' & ' + 'more';
			_res.status(400).json({
				message: 'Data Service ' + data.name + ' cannot be stopped as it is being used by the following ' + serviceMsg + '. Try again after stopping/delinking from the related Data Services.'
			});
			throw new Error('____CUSTOM_ENTITY_STOP_MSG_____');
		})
		.then(() => {
			if (originalDoc.status != 'Draft')
				return destroyDeployment(id, 0, _req);
		})
		.then(() => {
			deployUtil.sendToSocket(socket, 'serviceStatus', { _id: id, app: originalDoc.app, message: 'Entity has been stopped.' });
			logger.debug(`[${txnId}] Socket updated :: serviceStatus :: Entity has been stopped.`);
			return removeIncomingRelation(id, _req);
		})
		.then(() => {
			if (process.env.SM_ENV == 'K8s' && originalDoc.status != 'Draft') {
				return k8s.deploymentDelete(txnId, originalDoc)
					.then(() => logger.info(`[${txnId}] Deployment deleted for ${originalDoc._id}`))
					.then(() => k8s.serviceDelete(txnId, originalDoc))
					.then(() => logger.info(`[${txnId}] Service deleted for ${originalDoc._id})`))
					.catch(_e => logger.error(`[${txnId}] ${_e.message}`));
			}
		})
		.then(() => smHooks.removeServicesInGlobalSchema(id, _req))
		.then(() => {
			if (originalDoc && originalDoc.permanentDeleteData) {
				logger.info(`[${txnId}] Deleting service ${id} : Dropping collection ${originalDoc.collectionName} under db ${process.env.DATA_STACK_NAMESPACE}-${originalDoc.app}`);
				dropCollections(originalDoc.collectionName, `${process.env.DATA_STACK_NAMESPACE}-${originalDoc.app}`, txnId, originalDoc.app);
			}
		})
		.then(() => {
			crudder.model.findOne({ _id: id, '_metadata.deleted': false })
				.then((doc) => {
					if (doc) {
						deployUtil.sendToSocket(socket, 'deleteService', { _id: id, app: doc.app, api: doc.api, message: 'Entity has been deleted' });
						logger.debug(`[${txnId}] Socket updated :: serviceStatus :: Entity has been deleted.`);
						removeWebHooks(id, _req);
						if (!originalDoc.permanentDeleteData) {
							logger.info(`[${txnId}] Soft deleting data service`);
							doc._metadata.deleted = true;
							return doc.save(_req);
						} else {
							return doc.remove(_req)
								.then(() => {
									if (doc.draftVersion) return draftCrudder.model.findOne({ _id: doc._id });
								})
								.then(draftDoc => {
									if (draftDoc) draftDoc.remove(_req);
								})
								.catch(err => logger.error(`[${txnId}] Error deleting draft : ${err.message}`));
						}
					}
				});
		})
		.then(() => {
			dataStackutils.eventsUtil.publishEvent('EVENT_DS_DELETE', 'dataService', _req, originalDoc);
			smHooks.deleteAudit(originalDoc.app + '.' + originalDoc.collectionName, _req);
		})
		.catch(err => {
			logger.error(`[${txnId}] Delete data service : ${err.message}`);
			if (!_res.headersSent) _res.status(500).send(err.message);
			if (err.message !== '____CUSTOM_ENTITY_STOP_MSG_____') {
				deployUtil.updateDocument(crudder.model, { _id: id }, { status: 'Undeployed' }, _req)
					.catch(e => logger.error(e.message));
			}
		});
};

e.documentCount = (_req, _res) => {
	let id = _req.params.id;
	const ids = _req.query.serviceIds ? _req.query.serviceIds.split(',') : [];
	const filter = {
		'_metadata.deleted': false,
		app: _req.params.app
	};
	if (id && id !== 'all') {
		filter._id = id;
	} else if (ids.length > 0) {
		filter._id = {
			$in: ids
		};
	} else {
		_res.status(200).json([]);
		return;
	}
	let functionName = id && id !== 'all' ? 'findOne' : 'find';
	return crudder.model[functionName](filter, 'collectionName app')
		.then(_doc => {
			if (_doc) {
				if (Array.isArray(_doc)) {
					return Promise.all(_doc.map(e => {
						return global.mongoConnection.db(`${process.env.DATA_STACK_NAMESPACE}-${e.app}`).collection(e.collectionName).count()
							.then(_count => {
								return {
									_id: e._id,
									count: _count
								};
							});
					}));
				} else {
					return global.mongoConnection.db(`${process.env.DATA_STACK_NAMESPACE}-${_doc.app}`).collection(_doc.collectionName).count();
				}
			} else {
				_res.status(404).json({
					message: 'No service found with id ' + id
				});
			}
		}).then(_count => {
			_res.status(200).json(_count);
		}).catch(err => {
			logger.error(err.message);
			if (!_res.headersSent) {
				_res.status(500).json({
					message: err.message
				});
			}
		});
};

e.deleteApp = function (_req, _res) {
	let app = _req.params.app;
	let socket = _req.app.get('socket');
	crudder.model.find({
		'app': app
	}, '_id')
		.then(_services => {
			let ids = _services.map(_s => _s.id);
			_res.json({
				message: 'Removing ' + ids + ' services'
			});
			return Promise.all(ids.map(id => destroyDeployment(id, 0, _req)));
		})
		.then(docs => {
			if (docs) {
				let promises = docs.map(doc => {
					deployUtil.sendToSocket(socket, 'serviceStatus', {
						_id: doc._id,
						app: doc.app,
						message: 'Undeployed'
					});
					dropCollections(doc.collectionName, `${process.env.DATA_STACK_NAMESPACE}-${doc.app}`, _req.get('TxnId'));
					deployUtil.sendToSocket(socket, 'deleteService', {
						_id: doc._id,
						app: doc.app,
						message: 'Entity has been deleted'
					});
					removeWebHooks(doc._id, _req);
					return doc.remove(_req);
				});
				return Promise.all(promises);
			}
		})
		.then(() => mongoose.model('globalSchema').find({
			'app': app
		}, '_id'))
		.then(docs => {
			if (docs) {
				return Promise.all(docs.map(doc => doc.remove(_req)));
			}
		})
		.catch(err => {
			logger.error(err.message);
			if (!_res.headersSent) {
				_res.status(500).json({
					message: err.message
				});
			}
		});
};
// change the status of service

function deleteLogs(srvcId, app, action) {
	logger.info(`Deleting Logs for service ID :: ${srvcId} :: Action :: ${action}`);
	logger.info(`URL :: ${envConfig.baseUrlMON}/${app}/appCenter/${srvcId}/${action}/purge`);
	let URL = envConfig.baseUrlMON + `/${app}/appCenter/${srvcId}/${action}/purge`;
	if (action === 'author-audit') {
		URL = envConfig.baseUrlMON + `/${app}/author/${srvcId}/audit/purge`;
	}
	if (action == 'audit') {
		// making two api calls to clear appcenter and author audits individually
		let URL2 = envConfig.baseUrlMON + `/${app}/author/${srvcId}/audit/purge`;
		return Promise.all([makePurgeApiCall(URL), makePurgeApiCall(URL2)]);
	} else {
		return makePurgeApiCall(URL);
	}
}

function makePurgeApiCall(url) {
	var options = {
		url: url,
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'JWT ' + global.SM_TOKEN
		},
		json: true
	};
	return new Promise((_resolve, _reject) => request.delete(options, function (err, res) {
		if (err) {
			logger.error(err.message);
			_reject();
		}
		else if (!res) {
			logger.error('Monitoring service is down!');
			_reject({
				'message': 'Monitoring service is down!'
			});
		}
		else if (res) _resolve();
	}));
}

e.changeStatus = function (req, res) {
	let app = req.params.app;
	let id = req.params.id;
	let status = req.query.status;
	let socket = req.app.get('socket');
	let relatedService = [];
	logger.debug(`[${req.get('TxnId')}] Status change :: ${id} :: ${status}`);
	crudder.model.findOne({ _id: id })
		.then(data => {
			if (data && data.relatedSchemas && data.relatedSchemas.incoming) {
				data.relatedSchemas.incoming.forEach(doc => relatedService.push(doc));
			}
			if (data && data.status == 'Maintenance') {
				logger.debug(`[${req.get('TxnId')}] Status change :: Service ${id} is in maintenance mode.`);
				res.json({
					status: 'Maintenance',
					message: 'In Maintenance ',
					relatedService: relatedService,
					maintenanceInfo: data.maintenanceInfo
				});
			}
			else {
				let outRelationIds = data && data.relatedSchemas && data.relatedSchemas.outgoing ? data.relatedSchemas.outgoing.map(_d => _d.service) : [];
				let outgoingAPIs;
				return crudder.model.find({ _id: { $in: outRelationIds } }, { app: 1, api: 1, _id: 1, port: 1, relatedSchemas: 1 }).lean(true)
					.then((inSrvc => {
						outgoingAPIs = { 'USER': { url: `${envConfig.baseUrlUSR}/${app}/usr` } };
						inSrvc.forEach(_d => {
							outgoingAPIs[_d._id] = _d;
							outgoingAPIs[_d._id].url = `/api/c/${_d.app}${_d.api}`;
						});
						logger.trace(`[${req.get('TxnId')}] Status change :: Service ${id} :: Outgoing APIs :: ${JSON.stringify(outgoingAPIs)}`);
						return crudder.model.findOneAndUpdate({ _id: id }, { status: status, '_metadata.lastUpdated': new Date() }, { runValidators: true });
					}))
					.then(doc => {
						if (doc && doc.status !== 'Active') {
							logger.info(`[${req.get('TxnId')}] Service status of ${id} changed to ${status}`);
							deployUtil.sendToSocket(socket, 'serviceStatus', { message: 'Deployed', _id: id, app: doc.app, port: 80, api: doc.api });
						}
						res.json({ message: 'Status changed', outgoingAPIs: outgoingAPIs });
					})
					.catch(err => {
						logger.error(`[${req.get('TxnId')}] Status change :: Service ${id} :: ${err.message}`);
						res.status(500).json({ message: err.message });
					});
			}
		});
};

e.StatusChangeFromMaintenance = function (req, res) {
	let app = req.params.app;
	let id = req.params.id;
	let socket = req.app.get('socket');

	logger.info(`Status Change from Maintenence for Service :: ${id} :: App :: ${app}`);

	let relatedService = [];
	let _sd = {};
	let outgoingAPIs;
	return findCollectionData(id)
		.then(data => {
			if (data) {
				_sd = data;
				relatedService.push(_sd._id);
				if (data && data.relatedSchemas && data.relatedSchemas.incoming) {
					data.relatedSchemas.incoming.forEach(doc => relatedService.push(doc.service));
				}
				let promises = relatedService.map(id => {
					return mongoose.connection.db.collection('services').findOneAndUpdate({ _id: id }, { $set: { status: 'Undeployed', maintenanceInfo: null } }, { runValidators: true })
						.then(doc => {
							if (doc) {
								if (doc.status !== 'Active') {
									deployUtil.sendToSocket(socket, 'serviceStatus', {
										message: 'Undeployed',
										_id: id,
										app: doc.app,
										// port: doc.port,
										port: 80,
										api: doc.api
									});
								}
							}
						});
				});
				return Promise.all(promises)
					.then(() => {
						return scaleDeployments(req, socket, relatedService, null, 0);
					})
					.then(() => {
						return scaleDeploymentsToOriginal(req, socket, relatedService, null, 0);
					})
					// .then(() => {
					// 	if (_sd._id) {
					// 		return mongoose.connection.db.collection('workflow').remove({ serviceId: _sd._id });
					// 	}
					// })
					.then(() => {
						if (_sd._id) {
							return deleteLogs(_sd._id, app, 'log');
						}
					})
					.then(() => {
						if (_sd._id) {
							return deleteLogs(_sd._id, app, 'audit');
						}
					})
					.then(() => {
						let outRelationIds = data.relatedSchemas.outgoing.map(_d => _d.service);
						return crudder.model.find({ _id: { $in: outRelationIds } }, { app: 1, api: 1, _id: 1, port: 1, relatedSchemas: 1 });
					})
					.then(inSrvc => {
						outgoingAPIs = { 'USER': { url: `${envConfig.baseUrlUSR}/usr` } };
						inSrvc.forEach(_d => {
							outgoingAPIs[_d._id] = _d;
							outgoingAPIs[_d._id].url = `/api/c/${_d.app}${_d.api}`;
						});
						res.json({
							message: 'Status changed',
							outgoingAPIs: outgoingAPIs
						});
					});
			}
		});
};

function getIdCounter(serviceId, app) {
	return crudder.model.findOne({ _id: serviceId, '_metadata.deleted': false }, 'collectionName')
		.then(_doc => {
			if (_doc) {
				var dbName = `${process.env.DATA_STACK_NAMESPACE}` + '-' + app;
				return global.mongoConnection.db(dbName).collection('counters').findOne({ _id: _doc.collectionName }, { next: 1 });
			}
		})
		.then(_d => {
			if (_d) {
				return _d.next;
			}
		});
}


e.startAllServices = (_req, _res) => {
	let txnId = _req.get('TxnId');
	var app = _req.params.app;
	let socket = _req.app.get('socket');
	logger.info(`[${txnId}] Start all services request received for app :: ${app}`);

	crudder.model.find({ 'app': app, 'status': 'Undeployed' })
		.then(docs => {
			if (docs) {
				logger.info(`[${txnId}] Services found :: ${docs.length}`);
				logger.trace(`[${txnId}] Services found :: ${JSON.stringify(docs)}`);

				let promises = docs.map(doc => {
					if (doc.definition.length == 1 && !doc.schemaFree) return;
					doc = doc.toObject();
					const ns = envConfig.dataStackNS + '-' + doc.app.toLowerCase().replace(/ /g, '');

					if (process.env.SM_ENV == 'K8s') {
						let instances = doc.instances ? doc.instances : 1;
						logger.info(`[${txnId}] Scaling ${doc._id}::${doc.name} to ${instances}`);

						return kubeutil.deployment.scaleDeployment(ns, doc.api.split('/')[1].toLowerCase(), instances)
							.then(_d => {
								if (_d.statusCode == 404) {
									return deployUtil.deployService(doc, socket, _req, false);
								}
							})
							.catch(err => {
								logger.error(err);
							});
					}
					return deployUtil.deployService(doc, socket, _req, false);

				});
				_res.status(202).json({
					message: 'Request to start all data services has been received'
				});
				return Promise.all(promises);
			} else {
				logger.debug(`[${txnId}] No Services found`);
				_res.status(400).json({
					message: 'No entity found'
				});
			}
		})
		.catch(e => {
			logger.error(e.message);
			if (!_res.headersSent) _res.status(500).json({
				message: e.message
			});
		});
};


e.stopAllServices = (_req, _res) => {
	let txnId = _req.get('TxnId');
	let app = _req.params.app;
	let socket = _req.app.get('socket');
	logger.info(`[${txnId}] Stop all services request received for app :: ${app}`);

	crudder.model.find({ 'app': app, status: 'Active' })
		.then(_services => {
			logger.info(`[${txnId}] Services found :: ${_services.length}`);
			logger.trace(`[${txnId}] Services found :: ${JSON.stringify(_services)}`);

			let promises = _services.map(doc => {
				if (process.env.SM_ENV == 'K8s') {
					logger.info(`[${txnId}] Scaling ${doc._id}::${doc.name} to 0`);

					const ns = envConfig.dataStackNS + '-' + doc.app.toLowerCase().replace(/ /g, '');
					return kubeutil.deployment.scaleDeployment(ns, doc.api.split('/')[1].toLowerCase(), 0)
						.then(_d => {
							let instances = _d && _d.status && _d.status.replicas ? _d.status.replicas : null;

							logger.debug(`[${txnId}] Instances of ${doc.name} at time of undeploying ${instances}`);
							if (doc && instances) {
								doc.instances = instances;
								return doc.save(_req);
							} else {
								return doc;
							}
						});
				}
				return destroyDeployment(doc._id, 0, _req);
			});
			_res.status(202).json({
				message: 'Request to stop all data services has been received'
			});
			return Promise.all(promises);
		})
		.then(docs => {
			let ids = docs.map(doc => doc._id);
			logger.debug(`[${txnId}] Updating status of services :: ${ids} :: to Undeployed`);

			docs.forEach(doc => {
				deployUtil.sendToSocket(socket, 'serviceStatus', {
					_id: doc._id,
					app: doc.app,
					message: 'Undeployed'
				});
			});
			ids.forEach(id => {
				crudder.model.findOne({
					_id: id
				})
					.then(doc => {
						if (doc) {
							doc.status = 'Undeployed';
							doc.save(_req);
						}
					});
			});
		})
		.catch(err => {
			logger.error(err);
			if (!_res.headersSent)
				_res.status(500).send(err.message);
		});
};

e.repairAllServices = (_req, _res) => {
	var app = _req.params.app;
	crudder.model.find({
		'app': app,
	})
		.then(docs => {
			if (docs && docs.length > 0) {
				let promises = docs.map(doc => {
					if (doc.definition.length == 1) return;
					return updateDeployment(_req, _res, doc.toObject());
				});
				_res.status(202).json({
					message: 'Request to repair all data services has been received'
				});
				return Promise.all(promises);
			} else {
				_res.status(400).json({
					message: 'No entity found'
				});
			}
		})
		.catch(e => {
			logger.error(e.message);
			if (!_res.headersSent) _res.status(500).json({
				message: e.message
			});
		});
};


e.repairService = (_req, _res) => {
	let id = _req.params.id;
	return crudder.model.findOne({
		_id: id
	})
		.then(_d => {
			_d.status = 'Pending';
			return _d.save(_req);
		})
		.then(_d => {
			_res.status(202).json({
				message: 'Repair Process Started.....'
			});
			logger.debug(_d);
			return updateDeployment(_req, _res, _d.toObject());
		})
		.catch(err => {
			logger.error(err.message);
			if (!_res.headersSent) {
				_res.status(500).json({
					message: err.message
				});
			}
		});
};

function updateDeployment(req, res, ds) {
	let srvcDoc = JSON.parse(JSON.stringify(ds));
	let socket = req.app.get('socket');
	return k8s.deploymentDelete(req.get('TxnId'), ds)
		.then(_d => {
			logger.info('Deployment deleted');
			logger.trace(_d);
			return k8s.serviceDelete(req.get('TxnId'), srvcDoc);
		})
		.then(_d => {
			logger.info('Service deleted');
			logger.trace(_d);
			// srvcDoc.definition = JSON.parse(srvcDoc.definition);
			return k8s.serviceStart(srvcDoc);
		})
		.then(_d => {
			logger.info('Service started');
			logger.trace(_d);
			return deployUtil.deployService(srvcDoc, socket, req, false);
		})
		.catch(err => {
			logger.error(err.message);
			if (!res.headersSent) {
				res.status(500).json({
					message: err.message
				});
			}
		});
}

e.getCounter = (_req, _res) => {
	let id = _req.params.id;
	let app = _req.params.app;
	return getIdCounter(id, app)
		.then(_c => {
			if (_c) {
				_res.status(200).json(_c);

			} else {
				var counter = { 'initialCounter': 1 };
				_res.status(200).json(counter.initialCounter);
			}
		})
		.catch(err => {
			logger.error(err.message);
			_res.status(500).json({
				message: err.message
			});
		});
};

let initDone = false;
e.readiness = function (req, res) {
	if (!initDone) {
		// require('../../util/init/init')();
		initDone = true;
	}
	return res.status(200).json();

};

e.health = function (req, res) {
	logger.trace('Mongo DB State:', mongoose.connection.readyState);
	logger.trace('NATS State:', client && client.nc ? client.nc.connected : null);
	if (mongoose.connection.readyState == 1 && client && client.nc && client.nc.connected) {
		return res.status(200).json();
	} else {
		return res.status(400).json();
	}
};

function changeStatusToMaintenance(req, ids, srvcId, status, message) {
	let socket = req.app.get('socket');
	let promises = ids.map(id => {
		return mongoose.connection.db.collection('services').findOneAndUpdate({ _id: id }, { $set: { status: status, maintenanceInfo: null } }, { runValidators: true })
			.then(doc => {
				if (doc) {
					if (doc.status !== 'Active') {
						logger.info('Service status of ' + id + ' changed to ' + status);
						deployUtil.sendToSocket(socket, 'serviceStatus', {
							message: 'Deployed',
							_id: id,
							app: doc.app,
							// port: doc.port,
							port: 80,
							api: doc.api
						});
					}
				}
			});
	});
	return Promise.all(promises)
		.then(() => {
			return mongoose.connection.db.collection('services').findOneAndUpdate({ _id: srvcId }, { $set: { status: status, maintenanceInfo: message } }, { runValidators: true });
		});
}

function scaleDeployments(req, socket, ids, srvcId, instance) {
	logger.info(`Scaling Deployments for Services :: ${ids}`);
	if (!ids.includes(srvcId)) ids.push(srvcId);
	let promises = ids.map(id => {
		return mongoose.connection.db.collection('services').findOne({ _id: id })
			.then(doc => {
				if (doc) {
					const ns = envConfig.dataStackNS + '-' + doc.app.toLowerCase().replace(/ /g, '');
					if (process.env.SM_ENV == 'K8s') {
						logger.info('Scaling of ' + id + 'to ' + instance);
						return kubeutil.deployment.scaleDeployment(ns, doc.api.split('/')[1].toLowerCase(), instance)
							.catch(err => {
								logger.error(err);
							});
					}
				}
			});
	});
	return Promise.all(promises);
}

function scaleDeploymentsFromStart(req, socket, ids, srvcId, instance) {
	if (!ids.includes(srvcId)) ids.push(srvcId);
	let promises = ids.map(id => {
		return mongoose.connection.db.collection('services').findOne({ _id: id })
			.then(doc => {
				if (doc) {
					const ns = envConfig.dataStackNS + '-' + doc.app.toLowerCase().replace(/ /g, '');
					if (process.env.SM_ENV == 'K8s') {
						logger.info('Scaling of ' + id + 'to ' + instance);
						return kubeutil.deployment.scaleDeployment(ns, doc.api.split('/')[1].toLowerCase(), instance)
							.then(_d => {
								logger.info('instances doc is ++++++++++++', _d);
								let instances = _d && _d.body && _d.body.status && _d.body.status.replicas ? _d.body.status.replicas : null;
								logger.info('instance is', instances);
								return mongoose.connection.db.collection('services').findOneAndUpdate({ _id: id }, { $set: { instances: instances } }, { runValidators: true });
							})
							.catch(err => {
								logger.error(err);
							});
					}
				}
			});
	});
	return Promise.all(promises);
}

function scaleDeploymentsToOriginal(req, socket, ids, srvcId) {
	if (srvcId) ids.push(srvcId);
	let promises = ids.map(id => {
		return mongoose.connection.db.collection('services').findOne({ _id: id })
			.then(doc => {
				if (doc) {
					logger.info('the value of instance in db', doc.instances);
					const ns = envConfig.dataStackNS + '-' + doc.app.toLowerCase().replace(/ /g, '');
					let instances = doc.instances ? doc.instances : 1;
					if (process.env.SM_ENV == 'K8s') {
						logger.info('Scaling of ' + id + 'to ' + instances);
						return kubeutil.deployment.scaleDeployment(ns, doc.api.split('/')[1].toLowerCase(), instances)
							.catch(err => {
								logger.error(err);
							});
					}
				}
			});
	});
	return Promise.all(promises);
}

e.purgeLogsService = async function (req, res) {
	let id = req.params.id;
	let type = req.params.type;
	let app = req.params.app;

	let doc = await crudder.model.findOne({ _id: id, app: app }).lean();
	if (!doc) {
		return res.status(404).json({ message: 'Data Service not found.' });
	}
	deleteLogs(id, app, type)
		.then(() => {
			res.status(200).json({});
		})
		.catch(err => {
			res.status(500).json({ 'message': err.message });
		});

};

e.purge = function (req, res) {
	let id = req.params.id;
	let socket = req.app.get('socket');
	logger.info(`Purge All Data request received for Service :: ${id}`);

	let _sd = {};
	let relatedService = [];
	return findCollectionData(id)
		.then(data => {
			if (data) {
				_sd = data;
				//relatedService.push(data._id);
				if (data && data.relatedSchemas && data.relatedSchemas.incoming) {
					data.relatedSchemas.incoming.forEach(doc => relatedService.push(doc.service));
				}
				relatedService.push(_sd._id);
				return mongoose.connection.db.collection('services').find({ $and: [{ _id: { $in: relatedService } }, { status: { $ne: 'Active' } }] }).toArray()
					.then(data => {
						if (data.length > 0) {
							let serviceMsg = '';
							if (data.length == 1) {
								serviceMsg = 'Related Data Service: ' + data[0].name + ' is not Active ';
							} else if (data.length == 2) {
								serviceMsg = 'Related Data Services: ' + data[0].name + ' & ' + data[1].name + ' are not Active ';
							} else {
								serviceMsg = 'Data Services: ' + data[0].name + ',' + data[1].name + ' & ' + 'more are not Active ';
							}

							res.status(400).json({
								message: serviceMsg
							});
						}
						else {
							let message = { 'type': 'purge' };
							return changeStatusToMaintenance(req, relatedService, _sd._id, 'Maintenance', JSON.stringify(message))
								.then(() => {
									return res.status(202).json({ 'message': 'Accepted' });
								})
								.then(() => {
									return scaleDeploymentsFromStart(req, socket, relatedService, _sd._id, 0);
								})
								.then(() => {
									return scaleDeployments(req, socket, relatedService, _sd._id, 1);
								});
						}
					})
					.catch(err => {
						res.status(500).json({ message: err.message });
					});
			}
		});

};

e.lockDocumentCount = (req, res) => {
	let id = req.params.id;
	let _sd = {};
	let collectionName = null;
	let app = null;
	return findCollectionData(id)
		.then(data => {
			if (data) {
				_sd = data;
				collectionName = _sd.collectionName;
				app = _sd.app;
				let dbName = envConfig.isK8sEnv() ? `${envConfig.dataStackNS}-${app}` : `${envConfig.dataStackNS}-${app}`;

				return global.mongoConnection.db(dbName).collection(collectionName).find({ '_metadata.workflow': { $exists: true } }).count()
					.then(count => {
						res.status(200).json({ count: count });
					})
					.catch(err => {
						res.status(400).json({ message: err.message });
					});
			}

			else {
				res.status(400).json({});
			}
		});

};

function findCollectionData(Id) {
	return mongoose.connection.db.collection('services').findOne({ '_id': Id })
		.then(result => {
			return result;
		})
		.catch(err => {
			return err;
		});
}

async function customShow(req, res) {
	let draft = req.query.draft;
	let id = req.params.id;
	let app = req.params.app;

	try {
		let filter = req.query.filter;

		if (filter) {
			try {
				filter = JSON.parse(filter);
			} catch (err) {
				logger.error(err);
				filter = null;
			}
		}
		if (!filter) {
			filter = {};
		}
		filter.app = app;
		filter._id = id;
		let select = req.query.select ? req.query.select.split(',').join(' ') : '';

		let data;
		if (draft) {
			let draftData = await draftCrudder.model.findOne(filter);
			if (draftData) {
				data = await draftCrudder.model.findOne(filter, select).lean();
			} else {
				data = await crudder.model.findOne(filter, select).lean();
			}
		} else {
			data = await crudder.model.findOne(filter, select).lean();
		}
		if (data) {
			return res.status(200).json(data);
		} else {
			return res.status(404).json({ message: 'Service not found' });
		}
	} catch (err) {
		logger.error(err);
	}
}

async function showByName(req, res) {
	try {
		const draft = req.query.draft;
		const name = req.params.name;
		const app = req.params.app;
		let select = req.query.select;
		select = select ? select.split(',') : [];
		const filter = { name: name, app: app, '_metadata.deleted': false };
		let query;
		let doc;
		if (draft) {
			query = draftCrudder.model.findOne(filter);
			if (select.length > 0) {
				query = query.select(select.join(' '));
			}
			doc = await query.lean();
		}
		if (!doc) {
			query = crudder.model.findOne(filter);
			if (select.length > 0) {
				query = query.select(select.join(' '));
			}
			doc = await query.lean();
		}
		if (!doc) {
			return res.status(404).json({ message: 'Document not found' });
		}
		res.status(200).json(doc);
	} catch (err) {
		logger.error('Error in showByName');
		logger.error(err);
		res.status(500).json({ message: err.message });
	}
}

async function customIndex(req, res) {
	const app = req.params.app;
	const draft = req.query.draft;
	let filter = req.query.filter;

	if (filter) {
		try {
			filter = JSON.parse(filter);
		} catch (err) {
			logger.error(err);
			filter = null;
		}
	}
	if (!filter) {
		filter = {};
	}
	filter.app = app;
	req.query.filter = JSON.stringify(filter);
	if (draft)
		draftCrudder.index(req, res);
	else
		crudder.index(req, res);
}

function draftDelete(req, res) {
	let id = req.params.id;
	draftCrudder.model.findOne({ _id: id })
		.then(_d => {
			if (_d)
				return _d.remove(req);
		})
		.then(() => {
			return crudder.model.findOne({ _id: id });
		})
		.then(_d => {
			_d.draftVersion = null;
			dataStackutils.eventsUtil.publishEvent('EVENT_DS_DISCARD_DRAFT', 'dataService', req, _d);
			return _d.save(req);
		}).then(() => {
			res.status(200).json({ message: 'Draft deleted for ' + id });
		})
		.catch(err => {
			res.status(500).json({ message: err.message });
			logger.error(err);
		});
}

function validateUserDeletion(req, res) {
	let id = req.params.userId;
	let app = req.params.app;
	let promise = [];
	let pr = [];
	let flag = false;
	crudder.model.find({ 'relatedSchemas.internal.users.0': { $exists: true }, app: app })
		.then(_d => {
			promise = _d.map(data => {
				let db = global.mongoConnection.db(`${process.env.DATA_STACK_NAMESPACE}-${data.app}`);
				if (!data.relatedSchemas) {
					data.relatedSchemas = {};
				}
				if (!data.relatedSchemas.internal) {
					data.relatedSchemas.internal = {};
				}
				if (!data.relatedSchemas.internal.users) {
					data.relatedSchemas.internal.users = [];
				}
				let filter = data.relatedSchemas.internal.users.map(doc => {
					if (doc.filter) {
						doc.filter = doc.filter.replace('{{id}}', id);
					}
					return doc;
				});
				pr = filter.map(doc => {
					if (!doc.filter) {
						return Promise.resolve();
					}
					return db.collection(data.collectionName).find(JSON.parse(doc.filter)).count()
						.then(count => {
							if (count > 0 && doc.isRequired) {
								flag = true;
							}
						});
				});
				return Promise.all(pr).then();
			});
			return Promise.all(promise)
				.then(() => {
					if (flag) {
						return res.status(500).json({ message: 'Document is in use' });
					}
					res.status(200).json({});
				});
		});
}

function userDeletion(req, res) {
	let id = req.params.userId;
	let app = req.params.app;
	let promise = [];
	let pr = [];
	crudder.model.find({ 'relatedSchemas.internal.users.0': { $exists: true }, app: app })
		.then(_d => {
			promise = _d.map(data => {
				let db = global.mongoConnection.db(`${process.env.DATA_STACK_NAMESPACE}-${data.app}`);
				let filter = data.relatedSchemas.internal.users.map(doc => doc.filter.replace('{{id}}', id));
				let path = data.relatedSchemas.internal.users.map(doc => doc.path);
				filter = filter.map(doc => JSON.parse(doc));
				filter.push({});
				return db.collection(data.collectionName).find({ $or: filter }).count()
					.then(_c => {
						let totalBatches = _c / 30;
						totalBatches = Math.ceil(totalBatches);
						let arr = [];
						for (let i = 0; i < totalBatches; i++) {
							arr.push(i);
						}
						return arr.reduce((_pr, cur, i) => {
							return _pr
								.then(() => {
									return db.collection(data.collectionName).find({ $or: filter }).limit(30).skip(30 * i).toArray();
								})
								.then(docs => {
									pr = docs.map(doc => {
										let updatedDocuments = updateDoc(path, doc, id);
										let _id = updatedDocuments._id;
										delete updatedDocuments._id;
										db.collection(data.collectionName).findOneAndUpdate({ '_id': _id }, { $set: updatedDocuments }, { upsert: true });
									});
									Promise.all(pr);
								});
						}, Promise.resolve());
					});
			});
			Promise.all(promise)
				.then();
		})
		.then(() => {
			res.status(200).json({});
		})
		.catch(err => {
			res.status(500).json({ message: err.message });
		});
}

function updateDoc(path, doc, id) {
	path.map(ftr => {
		if (!_.isEmpty(ftr)) {
			generateCodeToRemoveExtId(getSelect(JSON.parse(ftr), ''), doc, id);
		}
	});
	return doc;
}

function generateCodeToRemoveExtId(path, doc, docId) {
	let pathSplit = path.split('.');
	let key = pathSplit.shift();
	if (doc.constructor == {}.constructor && key && doc[key] && key != '_id') {
		if (Array.isArray(doc[key])) {
			let newKey = pathSplit.join('.');
			doc[key] = doc[key].filter(_d => generateCodeToRemoveExtId(newKey, _d, docId));
		} else {
			doc[key] = generateCodeToRemoveExtId(pathSplit.join('.'), doc[key], docId);
			return doc;
		}
	} else if (pathSplit.length == 0 && doc._id == docId) {
		return null;
	}
	return doc;
}

function getSelect(obj, key) {
	if (typeof obj == 'object') {
		let obKey = Object.keys(obj)[0];
		let newKey = key;
		if (obKey != '_self') newKey = key == '' ? obKey : key + '.' + obKey;
		return getSelect(obj[obKey], newKey);
	}
	else {
		return key;
	}
}

function getCalendarDSDetails(app) {
	return {
		name: app + ' Calendar',
		api: `/${_.camelCase(app + 'Calendar')}`,
		app: app,
		type: 'internal'
	};
}

/**
 * 
 * @param {*} dsDefinition 
 * This method creates DS with definition and does not do any validation apart from one mentioned in pre save/validate hooks.
 */
function createDSWithDefinition(req, dsDefinition) {
	logger.debug('Creating DS with definiton :: ', JSON.stringify(dsDefinition));
	let model = mongoose.model('services');
	let doc = new model(dsDefinition);
	let roles = rolesUtil.getDefaultRoles();
	return doc.save(req).then((_d) => {
		let serviceObj = _d;
		let permObj = {
			_id: serviceObj._id,
			app: serviceObj.app,
			entity: serviceObj._id,
			entityName: serviceObj.name,
			roles: rolesUtil.getDefaultRoles(),
			type: 'appcenter',
			fields: JSON.stringify(rolesUtil.getDefaultFields(roles.map(e => e.id), dsDefinition.definition, {})),
			definition: serviceObj.definition

		};
		doc.role = permObj;
		return serviceObj;
	})
		.then(() => doc.save(req))
		.then((_d) => doc = _d)
		.then(() => smHooks.createDSinMON(doc, req))
		.then(() => Promise.resolve(doc))
		.catch(err => {
			logger.error('Error in createDSWithDefinition :: ', err);
			return Promise.reject(err);
		});
}

function enableCalendar(req, res) {
	let app = req.body.app;
	let calendarDSDetails = getCalendarDSDetails(app);
	logger.debug('Enabling calendar DS for app :: ', calendarDSDetails);
	crudder.model.findOne(calendarDSDetails).then(ds => {
		if (ds) {
			logger.debug('Calendar DS found, deploying now');
			res.status(202).json({ message: 'Deploying calendar DS' });
			return updateDeployment(req, res, ds);
		} else {
			logger.debug('Creating calendar DS');
			let promises = [getNextPort(), smHooks.validateAppAndGetAppData(req), apiUniqueCheck(calendarDSDetails.api, app), nameUniqueCheck(calendarDSDetails.name, app)];
			return Promise.all(promises).then(data => {
				calendarDSDetails.port = data[0];
				return createDSWithDefinition(req, getCalendarDSDefinition(calendarDSDetails))
					.then((ds) => {
						logger.debug('Calendar DS created :: ', ds);
						res.status(202).json({ message: 'Enabling calendar for ' + app });
						return updateDeployment(req, res, ds);
					});
			}).catch(err => {
				logger.error('Error in creating calendar ds :: ', err);
				res.status(400).json({ message: err.message });
			});
		}
	});
}

function disableCalendar(req, res) {
	let app = req.body.app;
	logger.debug('Disabling calendar for app :: ', app);
	let calendarDSDetails = getCalendarDSDetails(app);
	crudder.model.findOne(calendarDSDetails).then(ds => {
		if (ds) {
			logger.debug('Calendar DS found, destroying now');
			res.status(202).json({ message: 'Disabling Calendar for ' + app });
			return destroyDeployment(ds._id, 0, req).then(() => deployUtil.updateDocument(crudder.model, {
				_id: ds._id
			}, {
				status: 'Undeployed'
			}, req))
				.then(() => {
					// deployUtil.updatePMForCalendar(req, { status: 'Undeployed', app: app })
				})
				.catch((err) => { throw err; });
		} else {
			logger.debug('Calendar DS not found for ' + app);
			return res.status(404).json({ message: 'Calendar DS not found for ' + app });
		}
	}).catch(err => {
		logger.error('Error in disabling calendar for ', app);
		return res.status(400).json({ message: err.message });
	});
}

/**
 * 
 * @param {*} serviceId 
 * @param {*} projection 
 * get service details by id with projection
 */
function getServiceDetailsById(serviceId, projection) {
	return new Promise((resolve, reject) => {
		if (!projection) projection = {};
		crudder.model.findOne({ _id: serviceId }, projection)
			.then((doc) => {
				resolve(doc);
			}).catch((err) => {
				logger.error('Error in getServiceDetailsById :: ', err);
				reject(err);
			});
	});
}

/**
 * 
 * @param {*} app 
 * @param {*} collectionName 
 * @param {*} field 
 * Checks for field to be uninque for given collection and app
 */

function checkUniqueField(app, collectionName, field) {
	let aggregateQuery = [
		// To consider non null existing values
		{ '$match': {} },
		// Group by the field to check uniqueness for
		{
			'$group': {
				'_id': { value: '$' + field },
				'count': { '$sum': 1 }
			}
		},
		// Find any group with count more than one
		{
			'$match': {
				'count': { '$gt': 1 }
			}
		}
	];
	aggregateQuery[0]['$match'][field] = { '$ne': null };
	return new Promise((resolve, reject) => {
		global.mongoConnection.db(`${process.env.DATA_STACK_NAMESPACE}-${app}`)
			.collection(collectionName).aggregate(aggregateQuery).toArray()
			.then(result => {
				let res = {};
				res[field] = false;
				if (result && result.length == 0)
					res[field] = true;
				else
					logger.debug('result of field ' + field + ' :: ' + JSON.stringify(result));
				resolve(res);
			}).catch(err => {
				logger.error('Error in checkUniqueField :: ', err);
				reject(err);
			});
	});
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * Checks if given fields can be unique for given service Id.
 */

function checkUnique(req, res) {
	let serviceId = req.params.id;
	let fields = req.query.fields;
	fields = fields.split(',');
	getServiceDetailsById(serviceId, { app: 1, collectionName: 1 })
		.then(srvcDetails => {
			let promiseArr = fields.map(field => checkUniqueField(srvcDetails.app, srvcDetails.collectionName, field));
			Promise.all(promiseArr).then((result) => {
				let response = {};
				result.forEach(r => Object.assign(response, r));
				res.json(response);
			}).catch(err => {
				logger.error('Error in checkUnique :: ', err);
				res.status(400).json({ message: err.message });
			});
		}).catch(err => {
			logger.error('Error in checkUnique :: ', err);
			res.status(400).json({ message: err.message });
		});
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * Returns the map of status and count of DS for the status
 */
function countByStatus(req, res) {
	let filter = req.query.filter;
	if (filter) {
		if (typeof filter == 'string')
			filter = JSON.parse(filter);
	} else {
		filter = {};
	}
	filter['_metadata.deleted'] = false;
	let aggregateQuery = [
		{ $match: filter },
		{
			$group: {
				_id: '$status',
				count: { $sum: 1 }
			}
		}
	];
	crudder.model.aggregate(aggregateQuery).then((result) => {
		let response = {};
		let total = 0;
		result.forEach(rs => {
			response[rs._id] = rs.count;
			total += rs.count;
		});
		response['Total'] = total;
		return res.json(response);
	}).catch(err => {
		logger.error('Error in countByStatus :: ', err);
		return res.status(400).json({ message: err.message });
	});
}


async function getYamls(req, res) {
	try {
		const txnId = req.get('txnId');
		const doc = await crudder.model.findOne({ _id: req.params.id }).lean();

		const namespace = (envConfig.dataStackNS + '-' + doc.app).toLowerCase();
		// const port = doc.port;
		const port = 8000;
		const name = (doc.api).substring(1).toLowerCase();
		const envVars = [
			{ name: 'DATA_STACK_NAMESPACE', value: process.env.DATA_STACK_NAMESPACE },
			{ name: 'SERVICE_ID', value: `${doc._id}` }
		];

		const volumeMounts = {
			'file-export': {
				containerPath: '/app/output',
				hostPath: `${envConfig.fsMount}/${doc._id}`
			}
		};
		logger.trace(`[${txnId}] [${doc._id}] Volume mount data : ${JSON.stringify(volumeMounts)}`);

		const options = {
			livenessProbe: {
				httpGet: {
					path: '/api/internal/health/live',
					// port: doc.port,
					port: port,
					scheme: 'HTTP'
				},
				initialDelaySeconds: 5,
				timeoutSeconds: envConfig.healthTimeout
			},
			readinessProbe: {
				httpGet: {
					path: '/api/internal/health/ready',
					// port: doc.port,
					port: port,
					scheme: 'HTTP'
				},
				initialDelaySeconds: 5,
				timeoutSeconds: envConfig.healthTimeout
			}
		};

		const deployData = {
			apiVersion: 'apps/v1',
			kind: 'Deployment',
			metadata: {
				name: name,
				namespace: namespace
			},
			spec: {
				replicas: 1,
				selector: {
					matchLabels: {
						app: name
					}
				},
				template: {
					metadata: {
						labels: {
							app: name
						}
					},
					spec: {
						containers: [
							{
								name: name,
								image: envConfig.baseImage,
								ports: [
									{
										containerPort: port
									}
								],
								env: envVars
							}
						]
					}
				}
			}
		};
		if (options.livenessProbe) deployData.spec.template.spec.containers[0]['livenessProbe'] = options.livenessProbe;
		if (options.readinessProbe) deployData.spec.template.spec.containers[0]['readinessProbe'] = options.readinessProbe;
		if (volumeMounts) {
			deployData.spec.template.spec.containers[0]['volumeMounts'] = [];
			deployData.spec.template.spec['volumes'] = [];
			for (var mount in volumeMounts) {
				deployData.spec.template.spec.containers[0]['volumeMounts'].push({
					'name': mount,
					'mountPath': volumeMounts[mount]['containerPath']
				});
				deployData.spec.template.spec['volumes'].push({
					'name': mount,
					'hostPath': {
						'path': volumeMounts[mount]['hostPath']
					}
				});
			}
		}

		const serviceData = {
			apiVersion: 'v1',
			kind: 'Service',
			metadata: {
				name: name,
				namespace: namespace
			},
			spec: {
				type: 'ClusterIP',
				selector: {
					app: name
				},
				ports: [
					{
						protocol: 'TCP',
						port: 80,
						targetPort: port
					}
				]
			}
		};

		const serviceText = yamljs.stringify(serviceData);
		const deploymentText = yamljs.stringify(deployData);
		res.status(200).json({ service: serviceText, deployment: deploymentText });

	} catch (err) {
		logger.error(err);
		res.status(500).json({ message: err.message });
	}
}

async function getEnvVars(req, res) {
	try {
		let envVars = {};
		envConfig.envkeysForDataService.forEach(key => {
			envVars[key] = process.env[key];
		});
		envVars['NODE_OPTIONS'] = `--max-old-space-size=${envConfig.maxHeapSize}`;
		envVars['NODE_ENV'] = 'production';

		res.status(200).json(envVars);

	} catch (err) {
		logger.error(err);
		res.status(500).json({ message: err.message });
	}
}

async function importFromXLSX(req, res) {
	let doc;
	let responseSent = false;
	try {
		let socket = req.app.get('socket');
		const serviceTransfers = mongoose.model('service-transfers');
		const transfersDoc = new serviceTransfers({
			app: req.params.app,
			fileName: req.files.file.name,
			status: 'Pending',
			user: req.user._id
		});
		doc = await transfersDoc.save(req);
		deployUtil.sendToSocket(socket, 'serviceImport', { message: 'File Import Processing', _id: doc._id, app: doc.app });
		res.status(200).json({ message: 'File is Processing' });
		responseSent = true;
		const result = await xlsxUtils.readFileForDataService(req, doc._id);
		if (!result || result.length == 0) {
			doc.status = 'Error';
			doc.error = 'Unable to read file';
			await doc.save(req);
			// res.status(400).json({ message: 'Something Went Wrong While reading the File' });
			return;
		}
		if (result.some(e => e.statusCode != '200')) {
			doc.status = 'Error';
			doc.error = 'Errors in File Data';
			doc.result = result.map(e => e.body);
			await doc.save(req);
			// res.status(400).json({ message: 'Errors found in File Data' });
			return;
		}
		doc.result = result.map(e => e.body);
		doc.status = 'Uploaded';
		await doc.save(req);
		deployUtil.sendToSocket(socket, 'serviceImport', { message: 'File Import Processed', _id: doc._id, app: doc.app });
		// res.status(200).json({ result, importId: doc._id });
	} catch (err) {
		doc.status = 'Error';
		doc.error = err.message;
		await doc.save(req);
		logger.error(err);
		if (!responseSent) {
			res.status(400).json({ message: err.message });
		}
	}

}

module.exports = {
	create: e.createDoc,
	index: customIndex,
	show: customShow,
	showByName: showByName,
	destroy: e.destroyService,
	update: e.updateDoc,
	health: e.health,
	readiness: e.readiness,
	count: crudder.count,
	startService: e.startAPIHandler,
	stopService: e.stopAPIHandler,
	deployService: e.deployAPIHandler,
	documentCount: e.documentCount,
	deleteApp: e.deleteApp,
	changeStatus: e.changeStatus,
	StatusChangeFromMaintenance: e.StatusChangeFromMaintenance,
	verifyHook: e.verifyHook,
	getCounter: e.getCounter,
	getYamls,
	stopAllServices: e.stopAllServices,
	startAllServices: e.startAllServices,
	repairAllServices: e.repairAllServices,
	repairService: e.repairService,
	purge: e.purge,
	purgeLogsService: e.purgeLogsService,
	lockDocumentCount: e.lockDocumentCount,
	draftDelete: draftDelete,
	validateUserDeletion: validateUserDeletion,
	userDeletion: userDeletion,
	enableCalendar: enableCalendar,
	disableCalendar: disableCalendar,
	checkUnique: checkUnique,
	countByStatus: countByStatus,
	importFromXLSX,
	getEnvVars
};