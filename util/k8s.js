const kubeutil = require('@appveen/data.stack-utils').kubeutil;
const logger = global.logger;
const envConfig = require('../config/config');
let release = envConfig.RELEASE;
let dockerReg = process.env.DOCKER_REGISTRY_SERVER ? process.env.DOCKER_REGISTRY_SERVER : '';
if (dockerReg.length > 0 && !dockerReg.endsWith('/')) dockerReg += '/';
logger.info('Docker registry configured:: ' + dockerReg);
var e = {};

e.deploymentDelete = (_txnId, _schema) => {
	// (_namespace, _name)
	logger.info(`[${_txnId}] Kubernetes delete deployment ${_schema._id}`);
	logger.trace(`[${_txnId}] ${JSON.stringify(_schema)}`);
	const ns = envConfig.dataStackNS + '-' + _schema.app.toLowerCase().replace(/ /g, '');
	logger.debug(`[${_txnId}] Kubernetes delete deployment :: ${_schema._id} :: ns :: ${ns}`);
	return kubeutil.deployment.deleteDeployment(
		ns,
		_schema.api.split('/')[1].toLowerCase())
		.then(_ => {
			let statusCode = _.statusCode || _.response?.status;
			logger.debug(`[${_txnId}] Kubernetes delete deployment :: ${_schema._id} :: statusCode :: ${statusCode}`);
			logger.trace(`[${_txnId}] Kubernetes delete deployment :: ${_schema._id} :: response :: ${JSON.stringify(_)}`);
			if (statusCode != 200 && statusCode != 202 && statusCode != 404) {
				let errorMsg = _ && _.body && _.body.message ? _.body.message : 'K8s API returned ' + statusCode;
				logger.error(`[${_txnId}] Kubernetes delete deployment :: ${_schema._id} :: ${errorMsg}`);
				return new Error(errorMsg);
			} return _;
		})
		.catch(_ => {
			logger.error(`[${_txnId}] Kubernetes delete deployment ${_schema._id} :: Error deleting deployment`);
			logger.trace(`[${_txnId}] Kubernetes delete deployment ${_schema._id} :: ${JSON.stringify(_)}`);
		});
};

e.serviceStart = (_schema) => {
	// (_namespace, _name, _port)
	const ns = envConfig.dataStackNS + '-' + _schema.app.toLowerCase().replace(/ /g, '');
	logger.info('Creating service ' + ns + ' ' + _schema.api.split('/')[1].toLowerCase() + ' ' + 80);
	return kubeutil.service.createService(ns, _schema.api.split('/')[1].toLowerCase(), 80, release)
		.then(_ => {
			logger.info('Create service return ' + _.statusCode);
			logger.trace(`Service start response : ${JSON.stringify(_)}`);
			if (!envConfig.isAcceptableK8sStatusCodes(_.statusCode)) {
				let errorMsg = _ && _.body && _.body.message ? _.body.message : 'K8s API returned ' + _.statusCode;
				logger.error(errorMsg);
				return Error(errorMsg);
			} return _;
		})
		.catch(_ => {
			logger.error('Error starting service');
			logger.debug(JSON.stringify(_));
		});
};

e.serviceDelete = (_txnId, _schema) => {
	logger.info(`[${_txnId}] Kubernetes delete service ${_schema && _schema._id}`);
	logger.trace(`[${_txnId}] ${JSON.stringify(_schema)}`);
	const ns = envConfig.dataStackNS + '-' + _schema.app.toLowerCase().replace(/ /g, '');
	logger.debug(`[${_txnId}] Kubernetes delete service :: ${_schema._id} :: ns :: ${ns}`);
	return kubeutil.service.deleteService(
		ns,
		_schema.api.split('/')[1].toLowerCase())
		.then(_ => {
			let statusCode = _.statusCode || _.response.status;
			logger.debug(`[${_txnId}] Kubernetes delete service :: ${_schema._id} :: statusCode :: ${statusCode}`);
			logger.trace(`[${_txnId}] Kubernetes delete service :: ${_schema._id} :: response :: ${JSON.stringify(_)}`);
			if (statusCode != 200 && statusCode != 202 && statusCode != 404) {
				let errorMsg = _ && _.body && _.body.message ? _.body.message : 'K8s API returned ' + statusCode;
				logger.error(`[${_txnId}] Kubernetes delete service :: ${_schema._id} :: ${errorMsg}`);
				return Error(errorMsg);
			} return _;
		})
		.catch(_ => {
			logger.error(`[${_txnId}] Kubernetes delete service ${_schema._id} :: Error deleting service`);
			logger.trace(`[${_txnId}] Kubernetes delete service ${_schema._id} :: ${JSON.stringify(_)}`);
		});
};


module.exports = e;