'use strict';

const mongoose = require('mongoose');
const definition = require('../helpers/globalSchema.definition.js').definition;
const SMCrud = require('@appveen/swagger-mongoose-crud');
const utils = require('@appveen/utils');
const _ = require('lodash');
const dataStackUtils = require('@appveen/data.stack-utils');
const globalDefHelper = require('../helpers/util/globalDefinitionHelper');
const deployUtil = require('../deploy/deploymentUtil');
let queueMgmt = require('../../util/queueMgmt');
var client = queueMgmt.client;
const schema = new mongoose.Schema(definition, {
	usePushEach: true
});
const envConfig = require('../../config/config');
const request = require('request');
const smHooks = require('../helpers/serviceManagerHooks.js');
const logger = global.logger;
var e = {};
var options = {
	logger: logger,
	collectionName: 'globalSchema'
};

schema.index({ name: 1, app: 1 }, { unique: true });

let createGSInUserMgmt = function (_id, _req, body) {
	var options = {
		url: envConfig.baseUrlUSR + '/library/' + _id,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'TxnId': _req.get('txnId'),
			'Authorization': _req.get('Authorization'),
			'User': _req.get('user')
		},
		json: true,
		body: body
	};
	request.post(options, function (err, res) {
		if (err) {
			logger.error(err.message);
		} else if (!res) logger.error('User Management Service DOWN');
		else {
			logger.info('Library creation process of ' + _id + '  queued in user management');
		}
	});
};

let deleteGSInUserMgmt = function (_id, _req) {
	var options = {
		url: envConfig.baseUrlUSR + '/library/' + _id,
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			'TxnId': _req.headers && _req.headers['txnid'],
			'Authorization': _req.headers && _req.headers['authorization'],
			'User': _req.headers && _req.headers['user']
		},
		json: true
	};
	request.delete(options, function (err, res) {
		if (err) {
			logger.error(err.message);
		} else if (!res) logger.error('User Management Service DOWN');
		else {
			logger.info('Library deletion process of ' + _id + '  queued in user management');
		}
	});
};

function validateDefinition(schema) {

	schema.forEach(sch => {
		if (!sch['type'] || !sch['properties']) {
			throw new Error('Library definition is invalid');
		}
		if (sch['type'] === 'object' || sch['type'] === 'Array') {
			if (!sch['definition'] || typeof sch['definition'] != 'object') {
				throw new Error('Library definition is invalid');
			}
			validateDefinition(sch['definition']);
		}
	});
}

schema.pre('save', function (next) {
	let self = this;
	if (!self.definition) next();
	let definition = self.definition;
	if (!definition[0].definition || !Array.isArray(definition[0].definition)) {
		next(new Error('Library definition is invalid'));
	} else {
		try {
			validateDefinition(definition[0].definition);
		} catch (err) {
			next(new Error('Library definition is invalid'));
		}
	}
	next();
});

schema.pre('save', function (next) {
	if (!this.name) {
		next(new Error('Name is mandatory field'));
	} else {
		next();
	}
});

schema.pre('save', function (next) {
	let self = this;
	if (self._metadata.version) {
		self._metadata.version.release = process.env.RELEASE;
	}
	next();
});

schema.post('save', function (error, doc, next) {
	if (error.code == 11000 || (error && error.errors && error.errors.name)) {
		next(new Error('Library name already exists.'));
	} else {
		next();
	}
});

schema.pre('save', function (next, req) {
	let self = this;
	this._req = req;
	this.wasNew = this.isNew;
	if (self._id) {
		crudder.model.findOne({ '_id': self._id })
			.then(_d => {
				if (_d) {
					self._oldData = _d.toObject();
					if (self._oldData.app != self.app) {
						return next(new Error('App change not permitted'));
					}
					next();
				} else {
					next(new Error('could not find global schema ' + self._id));
				}
			});
	} else {
		next();
	}
});

schema.pre('save', utils.counter.getIdGenerator('SCHM', 'globalSchema', null, null, 1000));

schema.pre('save', dataStackUtils.auditTrail.getAuditPreSaveHook('globalSchema'));

schema.post('save', dataStackUtils.auditTrail.getAuditPostSaveHook('globalSchema.audit', client, 'auditQueue'));

schema.pre('remove', dataStackUtils.auditTrail.getAuditPreRemoveHook());

schema.post('remove', dataStackUtils.auditTrail.getAuditPostRemoveHook('globalSchema.audit', client, 'auditQueue'));

schema.pre('remove', function (next, req) {
	let self = this;
	this._req = req;
	_.isEmpty(self.services) ? next() : next(new Error(self.services + ' still use this definition'));
});

function deployService(serv, socket, _req) {
	let newServ = serv.toObject();
	return globalDefHelper.expandSchemaWithGlobalDef(newServ.app, JSON.parse(newServ.definition))
		.then(def => {
			newServ.definition = def;
			// serv.attributeList = deployUtil.getAttributeList(JSON.parse(JSON.stringify(def)));
			serv.definition = def;
			serv.version++;
			newServ.version++;
			return serv.save(_req);
		})
		.then(() => {
			// updateInusrMgmt(newServ, newServ.definition, _req).then(() => { });
			return deployUtil.deployService(JSON.parse(JSON.stringify(newServ)), socket, _req, true, false);
		});
	// .then(() => {
	// 	let permObj = {
	// 		app: newServ.app,
	// 		entity: newServ._id,
	// 		entityName: newServ.name,
	// 		definition: JSON.stringify(newServ.definition)
	// 	};
	// 	// return deployUtil.updateDefinitionUserMgmt(newServ._id, permObj, _req);
	// })
	// .then(() => {
	// 	return deployUtil.deployService(JSON.parse(JSON.stringify(newServ)), socket, _req, true, false);
	// });
}

schema.post('save', function (doc) {
	let socket = doc._req.socket;
	if (doc._oldData && doc.definition && doc._oldData.definition != doc.definition) {
		mongoose.model('services').find({ '_id': { '$in': doc.services } })
			.then(services => {
				let promiseArr = services.map(serv => deployService(serv, socket, doc._req));
				return Promise.all(promiseArr);
			})
			.then(() => {
				logger.info('Redeployed services ' + doc.services);
			})
			.catch(err => logger.error(err));
	}
});

schema.post('save', function (doc) {
	let eventId = 'EVENT_LIBRARY_UPDATE';
	if (doc.wasNew)
		eventId = 'EVENT_LIBRARY_CREATE';
	dataStackUtils.eventsUtil.publishEvent(eventId, 'library', doc._req, doc);
});

schema.post('remove', function (doc) {
	deleteGSInUserMgmt(doc._id, doc._req);
	dataStackUtils.eventsUtil.publishEvent('EVENT_LIBRARY_DELETE', 'library', doc._req, doc);
});

var crudder = new SMCrud(schema, 'globalSchema', options);
e.createDoc = (_req, _res) => {
	let txnId = _req.get('txnId');
	smHooks.validateAppAndGetAppData(_req)
		.then(() => {
			// if (_req.body.definition) _req.body.definition = JSON.stringify(_req.body.definition);
			return new crudder.model(_req.body).save(_req);
		})
		.then((_d) => {
			_res.json(_d);
			return createGSInUserMgmt(_d._id, _req, { _id: _d._id, app: _d.app });
		})
		.catch(err => {
			logger.error(`[${txnId}] : Error in createDoc of globalSchema :: `, err);
			if (!_res.headersSent) {
				_res.status(400).json({
					message: err.message
				});
			}
		});
};

e.updateDoc = (_req, _res) => {
	// if (_req.body.definition) {
	// 	_req.body.definition = JSON.stringify(_req.body.definition);
	// }
	crudder.update(_req, _res);
};

module.exports = {
	create: e.createDoc,
	index: crudder.index,
	show: crudder.show,
	destroy: crudder.destroy,
	update: e.updateDoc,
	count: crudder.count
};