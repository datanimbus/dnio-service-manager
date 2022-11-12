const mongoose = require('mongoose');
const request = require('request');
const _ = require('lodash');
const kubeutil = require('@appveen/data.stack-utils').kubeutil;

const config = require('../../config/config.js');
const k8s = require('../../util/k8s.js');

const logger = global.logger;
let e = {};

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
		// config.envkeysForDataService.forEach(key => envVars[key] = process.env[key]);
		envVars['DATA_STACK_NAMESPACE'] = process.env.DATA_STACK_NAMESPACE;
		// envVars['DATA_STACK_APP_NS'] = (config.dataStackNS + '-' + schema.app).toLowerCase();
		// envVars['NODE_OPTIONS'] = `--max-old-space-size=${config.maxHeapSize}`;
		// envVars['NODE_ENV'] = 'production';
		envVars['SERVICE_ID'] = `${schema._id}`;

		let deploymentEnvVars = [];
		Object.keys(envVars).forEach(key => deploymentEnvVars.push({ name: key, value: envVars[key] }));

		// logger.trace(`[${txnId}] Environment variables to send to DM ${schema._id} :: ${JSON.stringify(deploymentEnvVars)}`);

		let namespace = (config.dataStackNS + '-' + schema.app).toLowerCase();
		// let port = schema.port;
		let port = 80;
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
					path: '/api/internal/health/live',
					// port: schema.port,
					port: 80,
					scheme: 'HTTP'
				},
				initialDelaySeconds: 5,
				timeoutSeconds: config.healthTimeout
			},
			readinessProbe: {
				httpGet: {
					path: '/api/internal/health/ready',
					// port: schema.port,
					port: 80,
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

		let k8sDeploymentResponse = await kubeutil.deployment.createDeployment(namespace, name, config.baseImage, port, null, options, version, volumeMounts);
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
