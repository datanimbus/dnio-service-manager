const mongoose = require('mongoose');
const request = require('request');
const _ = require('lodash');
const kubeutil = require('@appveen/data.stack-utils').kubeutil;

const config = require('../../config/config.js');
const k8s = require('../../util/k8s.js');

const logger = global.logger;
let e = {};

// to check
// commented as attributeList is not required anymore
// e.getAttributeList = function (_definitions, parentKey, parentLabel) {
// 	let _temp = [];
// 	for (let i in _definitions) {
// 		let _def = _definitions[i];
// 		let key = (parentKey ? parentKey + `.` : ``) + i;
// 		let name = (parentLabel ? parentLabel + `.` : ``) + _def.properties.name;
// 		let properties = JSON.parse(JSON.stringify(_def.properties));
// 		if (_def.type == `Object`) {
// 			_temp = _temp.concat(e.getAttributeList(_def.definition, key, name));
// 		} else if (_def.type == `Array`) {
// 			//do nothing
// 		}
// 		else {
// 			_temp.push({
// 				key: key,
// 				name: name,
// 				properties
// 			});
// 		}
// 	}
// 	return _temp;
// };

e.postRolesUserMgmt = function (data, _req) {
	let txnId = _req.get('TxnId') || _req.headers.txnId;
	let id = data._id;
	var options = {
		url: config.baseUrlUSR + '/role',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'TxnId': _req.get('txnId'),
			'Authorization': _req.get('Authorization'),
			'User': _req.get('user')
		},
		json: true,
		body: data
	};
	return new Promise((resolve, reject) => {
		request.post(options, function (err, res) {
			if (err) {
				logger.error(`[${txnId}] Creating roles in UserMgmt :: ${id} :: ${err.message}`);
				reject(err);
			} else if (!res) {
				logger.error(`[${txnId}] Creating roles in UserMgmt :: ${id} :: User Management down.`);
				reject(new Error('User Management Service DOWN'));
			}
			else {
				if (res.statusCode >= 200 && res.statusCode < 400) {
					logger.info(`[${txnId}] Creating roles in UserMgmt :: ${id} :: Role Added`);
					resolve();
				} else {
					let message = res.body && res.body.message ? 'Roles creation failed:: ' + res.body.message : 'Roles creation failed';
					logger.error(`[${txnId}] Creating roles in UserMgmt :: ${id} :: ${message}`);
					reject(new Error(message));
				}
			}
		});
	});
};

e.updateRolesUserMgmt = function (serviceId, data, _req) {
	let txnId = _req.get('TxnId') || _req.headers.txnId;
	let id = serviceId;
	var options = {
		url: config.baseUrlUSR + '/role/' + serviceId,
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			'TxnId': _req.get('txnId'),
			'Authorization': _req.get('Authorization'),
			'User': _req.get('user')
		},
		json: true,
		body: data
	};
	return new Promise((resolve, reject) => {
		request.put(options, function (err, res) {
			if (err) {
				logger.error(`[${txnId}] Updating roles in UserMgmt :: ${id} :: ${err.message}`);
				reject(err);
			} else if (!res) {
				logger.error(`[${txnId}] Updating roles in UserMgmt :: ${id} :: User Management down.`);
				reject(new Error('User Management Service DOWN'));
			}
			else {
				if (res.statusCode >= 200 && res.statusCode < 400) {
					logger.info(`[${txnId}] Updating roles in UserMgmt :: ${id} :: Role Added`);
					resolve();
				} else {
					let message = res.body && res.body.message ? 'Roles updation failed :: ' + res.body.message : 'Roles updation failed';
					logger.error(`[${txnId}] Updating roles in UserMgmt :: ${id} :: ${message}`);
					reject(new Error(message));
				}
			}
		});
	});
};

e.deleteServiceInUserMgmt = function (_id, _req) {
	let txnId = _req.get('TxnId');
	var options = {
		url: config.baseUrlUSR + '/service/' + _id,
		method: 'Delete',
		headers: {
			'Content-Type': 'application/json',
			'TxnId': _req.get('TxnId'),
			'Authorization': _req.get('Authorization'),
			'User': _req.get('user')
		},
		json: true
	};
	request.delete(options, function (err, res) {
		if (err) logger.error(`[${txnId}] Delete service in UserMgmt :: ${_id} :: ${err.message}`);
		else if (!res) logger.error(`[${txnId}] Delete service in UserMgmt :: ${_id} :: User Management service DOWN`);
		else logger.info(`[${txnId}] Delete service in UserMgmt :: ${_id} :: Service deletion process queued.`);
	});
};

e.createServiceInUserMgmt = function (_id, _req, body) {
	let txnId = _req.get('TxnId');
	var options = {
		url: config.baseUrlUSR + '/service/' + _id,
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
		if (err) logger.error(`[${txnId}] Create service in UserMgmt :: ${_id} :: ${err.message}`);
		else if (!res) logger.error(`[${txnId}] Create service in UserMgmt :: ${_id} :: User Management service DOWN`);
		else logger.info(`[${txnId}] Create service in UserMgmt :: ${_id} :: Service creation process queued.`);
	});
};

e.deleteServiceInWorkflow = function (_id, _req) {
	let txnId = _req.get('TxnId');
	var options = {
		url: config.baseUrlWF + '/service/' + _id,
		method: 'Delete',
		headers: {
			'Content-Type': 'application/json',
			'TxnId': _req.get('txnId'),
			'Authorization': _req.get('Authorization'),
			'User': _req.get('user')
		},
		json: true
	};
	request.delete(options, function (err, res) {
		if (err) logger.error(`[${txnId}] Delete service in Workflow :: ${_id} :: ${err.message}`);
		else if (!res) logger.error(`[${txnId}] Delete service in Workflow :: ${_id} :: Workflow service DOWN`);
		else logger.info(`[${txnId}] Delete service in Workflow :: ${_id} :: Service deletion process queued.`);
	});
};

e.sendToSocket = function (_socket, _channel, _body) {
	_socket.emit(_channel, _body);
};

e.getSystemFields = (list, key, definition, systemFields) => {
	if (definition[0] && definition[0].key == '_self') {
		if (definition[0]['type'] === 'Object') {
			e.getSystemFields(list, key, definition[0]['definition'], systemFields);
		} else if (systemFields.indexOf(definition[0]['type']) > -1) {
			list[definition[0]['type']].push(key);
		}
	} else {
		definition.forEach(def => {
			let _k = def.key;
			let _key = key === '' ? _k : key + '.' + _k;
			if (def['type'] === 'Array' || def['type'] === 'Object') {
				e.getSystemFields(list, _key, def['definition'], systemFields);
			} else if (systemFields.indexOf(def['type']) > -1) {
				list[def['type']].push(_key);
			}
		});
	}
};

e.updateDocument = (model, query, updateObj, req) => {
	return model.findOne(query)
		.then(doc => {
			if (doc) {
				let newDoc = Object.assign({}, doc.toObject(), updateObj);
				if (_.isEqual(newDoc, doc.toObject()))
					return doc;
				else {
					return Object.assign(doc, updateObj).save(req);
				}
			}
		});
};

e.deployService = async (schema, socket, req, _isDeleteAndCreate) => {
	let txnId = req.get('TxnId') || req.headers.txnId;

	logger.info(`[${txnId}] Deploying service :: ${schema._id}`);

	let idDetails = schema['definition'].find(attr => attr.key == '_id');
	if (idDetails.counter && isNaN(idDetails.counter)) throw new Error('Counter is not valid');
	if (idDetails.padding && isNaN(idDetails.padding)) throw new Error('Padding is not valid');

	try {
		await e.updateDocument(mongoose.model('services'), { _id: schema._id }, { status: 'Pending' }, req);
		logger.debug(`[${txnId}] Service moved to pending status ${schema._id}`);

		let envVars = {};
		config.envkeysForDataService.forEach(key => envVars[key] = process.env[key]);
		envVars['DATA_STACK_APP_NS'] = (config.dataStackNS + '-' + schema.app).toLowerCase();
		envVars['NODE_OPTIONS'] = `--max-old-space-size=${config.maxHeapSize}`;
		envVars['NODE_ENV'] = 'production';
		envVars['SERVICE_ID'] = `${schema._id}`;

		let deploymentEnvVars = [];
		Object.keys(envVars).forEach(key => deploymentEnvVars.push({ name: key, value: envVars[key] }));

		logger.trace(`[${txnId}] Environment variables to send to DM ${schema._id} :: ${JSON.stringify(deploymentEnvVars)}`);

		let namespace = envVars['DATA_STACK_APP_NS'];
		let port = schema.port;
		let name = (schema.api).substring(1).toLowerCase();
		let version = schema.version;
		let volumeMounts = {
			'file-export': {
				containerPath: '/app/output',
				hostPath: `${config.fsMount}/${schema._id}`
			}
		};
		logger.trace(`[${txnId}] [${schema._id}] Volume mount data : ${JSON.stringify(volumeMounts)}`);

		let options = {
			livenessProbe: {
				httpGet: {
					path: `/${schema.app}${schema.api}/utils/health/live`,
					port: schema.port,
					scheme: 'HTTP'
				},
				initialDelaySeconds: 5,
				timeoutSeconds: config.healthTimeout
			},
			readinessProbe: {
				httpGet: {
					path: `/${schema.app}${schema.api}/utils/health/ready`,
					port: schema.port,
					scheme: 'HTTP'
				},
				initialDelaySeconds: 5,
				timeoutSeconds: config.healthTimeout
			}
		};
		logger.trace(`[${txnId}] [${schema._id}] Probes : ${JSON.stringify(options)}`);

		if (_isDeleteAndCreate) {
			await k8s.deploymentDelete(txnId, schema);
			logger.info(`[${txnId}] Deployment delete request queued for ${schema._id}`);
			await k8s.serviceDelete(txnId, schema);
			logger.info(`[${txnId}] Service delete request queued for ${schema._id}`);
		}

		let k8sServiceResponse = await kubeutil.service.createService(namespace, name, port, version);
		if (!config.isAcceptableK8sStatusCodes(k8sServiceResponse.statusCode)) throw new Error(`Service creation failed for service ${schema._id}/${schema.name}`);
		logger.trace(`[${txnId}] [${schema._id}] Service creation response: ${JSON.stringify(k8sServiceResponse)}`);

		let k8sDeploymentResponse = await kubeutil.deployment.createDeployment(namespace, name, config.baseImage, port, deploymentEnvVars, options, version, volumeMounts);
		if (!config.isAcceptableK8sStatusCodes(k8sDeploymentResponse.statusCode)) throw new Error(`Deployment creation failed for service ${schema._id}/${schema.name}`);
		logger.trace(`[${txnId}] [${schema._id}] Deployment creation response: ${JSON.stringify(k8sDeploymentResponse)}`);

	} catch (err) {
		logger.error(`[${txnId}] Deployment failed for service ${schema._id} :: ${err.message}`);
		logger.debug(`[${txnId}] Cleaning up deployment changes for service ${schema._id}`);

		if (socket) e.sendToSocket(socket, 'serviceStatus', { _id: schema._id, message: 'Undeployed', app: schema.app });

		logger.debug(`[${txnId}] Updating document status in db ${schema._id} :: Undeployed`);
		e.updateDocument(mongoose.model('services'), { _id: schema._id }, { status: 'Undeployed', comment: err.message }, req);
	}
};

e.updateInPM = function (id, req) {
	var options = {
		url: config.baseUrlPM + '/dataservice/' + id,
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			'TxnId': req ? req.get('txnId') : null,
			'Authorization': req ? req.get('Authorization') : null,
			'User': req ? req.get('user') : null
		},
		json: true
	};
	return new Promise((resolve, reject) => {
		request(options, function (err, res) {
			if (err) {
				logger.error(err.message);
				reject(err);
			} else if (!res) {
				logger.error('PM Service DOWN');
				reject(new Error('PM Service DOWN'));
			}
			else {
				if (res.statusCode >= 200 && res.statusCode < 400) {
					resolve();
					logger.info('DS updated in PM');
				} else {
					reject(new Error(res.body && res.body.message ? 'API failed:: ' + res.body.message : 'API failed'));
				}
			}
		});
	});
};

e.updatePMForCalendar = function (req, body) {
	var options = {
		url: config.baseUrlPM + '/flow/update/timebound',
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			'TxnId': req ? req.get('txnId') : null,
			'Authorization': req ? req.get('Authorization') : null,
			'User': req ? req.get('user') : null
		},
		json: body
	};
	return new Promise((resolve, reject) => {
		request(options, function (err, res) {
			if (err) {
				logger.error(err.message);
				reject(err);
			} else if (!res) {
				logger.error('PM Service DOWN');
				reject(new Error('PM Service DOWN'));
			}
			else {
				if (res.statusCode >= 200 && res.statusCode < 400) {
					resolve();
					logger.info('Calendar updated in PM');
				} else {
					reject(new Error(res.body && res.body.message ? 'API failed:: ' + res.body.message : 'API failed'));
				}
			}
		});
	});
};
module.exports = e;
