const mongoose = require(`mongoose`);
const _ = require(`lodash`);
const request = require(`request`);
const logger = global.logger;
const envConfig = require(`../../config/config.js`);
var e = {};

function getGlobalDefinitions(app) {
	return mongoose.model(`globalSchema`).find({ 'app': app }, { _id: 1, name: 1 });
}

function getGDDependencyObj(schema) {
	var gds = [];
	Object.keys(schema).forEach(key => {
		if (key != `properties` && key != `_id`) {
			if (schema[key][`properties`] && schema[key][`properties`][`schema`])
				gds.push(schema[key][`properties`][`schema`]);
			if (schema[key][`definition`]) {
				let nestedGds = getGDDependencyObj(schema[key][`definition`]);
				gds = _.union(gds, nestedGds);
			}
		}
	});
	return gds;
}

e.updateServicesInGlobalSchema = (serviceObj, req) => {
	let dependentGD = [];
	serviceObj = JSON.parse(JSON.stringify(serviceObj));
	if (!serviceObj.definition) return Promise.resolve();
	return getGlobalDefinitions(serviceObj.app)
		.then(gds => {
			gds = JSON.parse(JSON.stringify(gds));
			serviceObj.definition = typeof serviceObj.definition == `string` ? JSON.parse(serviceObj.definition) : serviceObj.definition;
			let schemaGDs = getGDDependencyObj(serviceObj.definition);
			schemaGDs.forEach((schemaGD) => {
				let depGD = gds.find(gd => gd._id === schemaGD);
				if (depGD) dependentGD.push(depGD._id);
				else {
					throw new Error(`Could not find global schema with ` + JSON.stringify(schemaGD));
				}
			});
			_.uniq(dependentGD);
			return mongoose.model(`globalSchema`).find({
				services: serviceObj._id
			});
		})
		// To remove serviceId in globalSchema which are not more using this service.
		.then(docs => {
			let promiseArr = [];
			if (docs) {
				docs.forEach(doc => {
					let index = dependentGD.indexOf(doc._id);
					if (index == -1) {
						doc.services = doc.services.filter(serv => serv != serviceObj._id);
						promiseArr.push(doc.save(req));
					} else {
						dependentGD.splice(doc._id, 1);
					}
				});
			}
			return Promise.all(promiseArr);
		})
		.then(() => {
			if (_.isEmpty(dependentGD)) return [];
			return mongoose.model(`globalSchema`).find({
				_id: {
					$in: dependentGD
				}
			});
		})
		// To add serviceId in global schema which is now using this service.
		.then(docs => {
			let promiseArr = [];
			if (docs) {
				docs.forEach(doc => {
					doc.services.push(serviceObj._id);
					promiseArr.push(doc.save(req));
				});
			}
			return Promise.all(promiseArr);
		});
};

e.removeServicesInGlobalSchema = function (serviceId, req) {
	return mongoose.model(`globalSchema`).find({
		services: serviceId
	})
		.then(docs => {
			let promiseArr = [];
			if (docs) {
				docs.forEach(doc => {
					doc.services = doc.services.filter(serv => serv != serviceId);
					promiseArr.push(doc.save(req));
				});
			}
			return Promise.all(promiseArr);
		});
};

e.validateApp = function (_req) {
	var options = {
		url: envConfig.baseUrlUSR + `/app/` + _req.body.app + `?select=_id,type`,
		method: `GET`,
		headers: {
			'Content-Type': `application/json`,
			'TxnId': _req.get(`TxnId`),
			'Authorization': _req.headers.authorization
		}
	};
	return new Promise((_resolve, _reject) => request.get(options, function (err, res) {
		if (err) {
			logger.error(err.message);
			_reject();
		} else if (!res) {
			logger.error(`App management service is down!`);
			_reject({
				'message': `App management service is down!`
			});
		} else if (res.statusCode == 404) {
			logger.info(`App ` + _req.body.app + ` not found!`);
			_reject({
				'message': `Invalid app`
			});
		} else {
			logger.info(`App ` + _req.body.app + ` exists!`);
			_resolve();
		}
	}));
};

e.createDSinMON = (serviceObj, _req) => {
	let body = {
		'srvc': serviceObj.app + `.` + serviceObj.collectionName
	};
	if (serviceObj.versionValidity && serviceObj.versionValidity.validityType == `time`) {
		body.expiry = serviceObj.versionValidity.validityValue;
	}
	var options = {
		url: envConfig.baseUrlMON + `/create`,
		headers: {
			'Content-Type': `application/json`,
			'TxnId': _req.get(`txnId`),
			'Authorization': _req.get(`Authorization`),
			'User': _req.get(`user`)
		},
		json: true,
		body: body
	};
	return new Promise((_resolve, _reject) => request.post(options, function (err, res) {
		if (err) {
			logger.error(err.message);
			_reject();
		}
		else if (!res) {
			logger.error(`Monitoring service is down!`);
			_reject({
				'message': `Monitoring service is down!`
			});
		}
		else if (res) _resolve();
	})
	);
};

e.updateExpiry = (serviceObj, _req, oldCollectionName, newCollectionName) => {
	let body = {};
	if (serviceObj.versionValidity.validityType == `time`) {
		body = {
			'srvc': serviceObj.app + `.` + serviceObj.collectionName,
			'expiry': serviceObj.versionValidity.validityValue
		};
	}
	if (serviceObj.versionValidity.validityType == `count`) {
		body = { 'srvc': serviceObj.app + `.` + serviceObj.collectionName };
	}
	if (oldCollectionName != newCollectionName) {
		body.oldCollectionName = serviceObj.app + `.` + oldCollectionName,
		body.newCollectionName = serviceObj.app + `.` + newCollectionName;
	}

	var options = {
		url: envConfig.baseUrlMON + `/update`,
		method: `PUT`,
		headers: {
			'Content-Type': `application/json`,
			'TxnId': _req.get(`txnId`),
			'Authorization': _req.get(`Authorization`),
			'User': _req.get(`user`)
		},
		json: true,
		body: body
	};
	return new Promise((_resolve, _reject) => request.put(options, function (err, res) {
		if (err) {
			logger.error(err.message);
			_reject();
		}
		else if (!res) {
			logger.error(`Monitoring service is down!`);
			_reject({
				'message': `Monitoring service is down!`
			});
		}
		else if (res) _resolve();
	}));

};

e.deleteAudit = (serviceObj, _req) => {

	var options = {
		url: envConfig.baseUrlMON + `/delete/` + serviceObj,
		method: `DELETE`,
		headers: {
			'Content-Type': `application/json`,
			'TxnId': _req.get(`txnId`),
			'Authorization': _req.get(`Authorization`),
			'User': _req.get(`user`)
		},
		json: true
	};


	return new Promise((_resolve, _reject) => request.delete(options, function (err, res) {
		if (err) {
			logger.error(err.message);
			_reject();
		}
		else if (!res) {
			logger.error(`Monitoring service is down!`);
			_reject({
				'message': `Monitoring service is down!`
			});
		}
		else if (res) _resolve();
	}));

};
module.exports = e;