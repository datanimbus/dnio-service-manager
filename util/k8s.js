const kubeutil = require('@appveen/data.stack-utils').kubeutil;
const logger = global.logger;
const envConfig = require('../config/config');
let release = process.env.RELEASE ;
let dockerReg = process.env.DOCKER_REGISTRY_SERVER ? process.env.DOCKER_REGISTRY_SERVER : '';
if (dockerReg.length > 0 && !dockerReg.endsWith('/')) dockerReg += '/';
logger.info('Docker registry configured:: ' + dockerReg);
var e = {};

let probeObject = {
	'httpGet': {
		'path': '',
		'port': null,
		'scheme': 'HTTP'
	},
	'initialDelaySeconds': 5,
	'timeoutSeconds': 1
};

e.deploymentCreate = (_schema) => {
	logger.info('Creating deployment ' + _schema._id.toLowerCase());
	let envVars = [];
	envVars.push({ name: 'MONGO_APPCENTER_URL', value: process.env.MONGO_APPCENTER_URL });
	envVars.push({ name: 'STREAMING_CHANNEL', value: process.env.STREAMING_CHANNEL });
	envVars.push({ name: 'STREANING_HOST', value: process.env.STREANING_HOST });
	envVars.push({ name: 'STREAMING_USER', value: process.env.STREAMING_USER });
	envVars.push({ name: 'STREANING_PASS', value: process.env.STREANING_PASS });
	envVars.push({ name: 'STREANING_RECONN_ATTEMPTS', value: process.env.STREANING_RECONN_ATTEMPTS });
	envVars.push({ name: 'STREANING_RECONN_TIMEWAIT_MILLI', value: process.env.STREANING_RECONN_TIMEWAIT_MILLI });
	envVars.push({ name: 'MODE', value: process.env.MODE });
	envVars.push({ name: 'GOOGLE_API_KEY', value: process.env.GOOGLE_API_KEY });
	envVars.push({ name: 'TLS_REJECT_UNAUTHORIZED', value: process.env.TLS_REJECT_UNAUTHORIZED });
	envVars.push({ name: 'HOOK_CONNECTION_TIMEOUT', value: process.env.HOOK_CONNECTION_TIMEOUT });
	envVars.push({ name: 'MONGO_RECONN_TRIES', value: process.env.MONGO_RECONN_TRIES });
	envVars.push({ name: 'MONGO_RECONN_TIME_MILLI', value: process.env.MONGO_RECONN_TIME_MILLI });
	envVars.push({ name: 'MONGO_LOGS_BASE_URL', value: process.env.MONGO_LOGS_BASE_URL });
	envVars.push({ name: 'MONGO_LOGS_DBNAME', value: process.env.MONGO_LOGS_DBNAME });
	envVars.push({ name: 'LOG_LEVEL', value: process.env.LOG_LEVEL });
	let options = {
		'livenessProbe': JSON.parse(JSON.stringify(probeObject)),
		'readinessProbe': JSON.parse(JSON.stringify(probeObject))
	};
	options.livenessProbe.httpGet.path = '/' + _schema.app + _schema.api + '/health';
	options.livenessProbe.httpGet.port = _schema.port;
	options.readinessProbe.httpGet.path = '/' + _schema.app + _schema.api + '/readiness';
	options.readinessProbe.httpGet.port = _schema.port;
	// (_namespace, _name, _image, _port, _envVars)
	const ns = envConfig.dataStackNS + '-' + _schema.app.toLowerCase().replace(/ /g, '');
	return kubeutil.deployment.createDeployment(
		ns,
		_schema.api.split('/')[1].toLowerCase(),
		dockerReg + _schema._id.toLowerCase() + ':' + _schema.version,
		_schema.port,
		envVars,
		options,
		release)
		.then(_ => {
			logger.info('Creating deployment returned ' + _.statusCode);
			logger.debug(JSON.stringify(_));
			if (_.statusCode > 202) {
				let errorMsg = _ && _.body && _.body.message ? _.body.message : 'K8s API returned ' + _.statusCode;
				logger.error(errorMsg);
				return Error(errorMsg);
			} return _;
		})
		.catch(_ => {
			logger.error('Error creating deployment');
			logger.debug(JSON.stringify(_));
		});
};

e.deploymentUpdate = (_schema) => {
	let envVars = [];
	envVars.push({ name: 'MONGO_APPCENTER_URL', value: process.env.MONGO_APPCENTER_URL });
	envVars.push({ name: 'STREAMING_CHANNEL', value: process.env.STREAMING_CHANNEL });
	envVars.push({ name: 'STREANING_HOST', value: process.env.STREANING_HOST });
	envVars.push({ name: 'STREAMING_USER', value: process.env.STREAMING_USER });
	envVars.push({ name: 'STREANING_PASS', value: process.env.STREANING_PASS });
	envVars.push({ name: 'STREAMING_RECONN_ATTEMPTS', value: process.env.STREANING_RECONN_ATTEMPTS });
	envVars.push({ name: 'STREANING_RECONN_TIMEWAIT_MILLI', value: process.env.STREANING_RECONN_TIMEWAIT_MILLI });
	envVars.push({ name: 'MODE', value: process.env.MODE });
	envVars.push({ name: 'GOOGLE_API_KEY', value: process.env.GOOGLE_API_KEY });
	envVars.push({ name: 'TLS_REJECT_UNAUTHORIZED', value: process.env.TLS_REJECT_UNAUTHORIZED });
	envVars.push({ name: 'HOOK_CONNECTION_TIMEOUT', value: process.env.HOOK_CONNECTION_TIMEOUT });
	envVars.push({ name: 'MONGO_RECONN_TRIES', value: process.env.MONGO_RECONN_TRIES });
	envVars.push({ name: 'MONGO_RECONN_TIME_MILLI', value: process.env.MONGO_RECONN_TIME_MILLI });
	envVars.push({ name: 'MONGO_LOGS_BASE_URL', value: process.env.MONGO_LOGS_BASE_URL });
	envVars.push({ name: 'MONGO_LOGS_DBNAME', value: process.env.MONGO_LOGS_DBNAME });
	envVars.push({ name: 'LOG_LEVEL', value: process.env.LOG_LEVEL });
	let options = {
		'livenessProbe': JSON.parse(JSON.stringify(probeObject)),
		'readinessProbe': JSON.parse(JSON.stringify(probeObject))
	};
	options.livenessProbe.httpGet.path = '/' + _schema.app + _schema.api + '/health';
	options.livenessProbe.httpGet.port = _schema.port;
	options.readinessProbe.httpGet.path = '/' + _schema.app + _schema.api + '/health';
	options.readinessProbe.httpGet.port = _schema.port;
	const ns = envConfig.dataStackNS + '-' + _schema.app.toLowerCase().replace(/ /g, '');
	// (_namespace, _name, _image, _port, _envVars)
	logger.debug({
		ns,
		name: _schema.api.split('/')[1].toLowerCase(),
		image: dockerReg + _schema._id.toLowerCase() + ':' + _schema.version,
		port: _schema.port,
		envVars,
		options: JSON.stringify(options)
	});
	return kubeutil.deployment.updateDeployment(
		ns,
		_schema.api.split('/')[1].toLowerCase(),
		dockerReg + _schema._id.toLowerCase() + ':' + _schema.version,
		_schema.port,
		envVars,
		options)
		.then(_ => {
			logger.debug(JSON.stringify(_));
			if (_.statusCode > 202) {
				let errorMsg = _ && _.body && _.body.message ? _.body.message : 'K8s API returned ' + _.statusCode;
				logger.error(errorMsg);
				return new Error(errorMsg);
			} return _;
		})
		.catch(_ => {
			logger.error('Error updating deployment');
			logger.debug(JSON.stringify(_));
		});
};

e.deploymentDelete = (_schema) => {
	// (_namespace, _name)
	const ns = envConfig.dataStackNS + '-' + _schema.app.toLowerCase().replace(/ /g, '');
	return kubeutil.deployment.deleteDeployment(
		ns,
		_schema.api.split('/')[1].toLowerCase())
		.then(_ => {
			logger.debug(JSON.stringify(_));
			if (_.statusCode != 200 && _.statusCode != 202 && _.statusCode != 404) {
				let errorMsg = _ && _.body && _.body.message ? _.body.message : 'K8s API returned ' + _.statusCode;
				logger.error(errorMsg);
				return new Error(errorMsg);
			} return _;
		})
		.catch(_ => {
			logger.error('Error deleting deployment');
			logger.debug(JSON.stringify(_));
		});
};

e.serviceStart = (_schema) => {
	// (_namespace, _name, _port)
	const ns = envConfig.dataStackNS + '-' + _schema.app.toLowerCase().replace(/ /g, '');
	logger.info('Creating service ' + ns + ' ' + _schema.api.split('/')[1].toLowerCase() + ' ' + _schema.port);
	return kubeutil.service.createService(
		ns,
		_schema.api.split('/')[1].toLowerCase(),
		_schema.port,
		release)
		.then(_ => {
			logger.info('Create service return ' + _.statusCode);
			logger.debug(JSON.stringify(_));
			if (_.statusCode > 202) {
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

e.serviceDelete = (_schema) => {
	// (_namespace, _name)
	logger.debug(_schema);
	const ns = envConfig.dataStackNS + '-' + _schema.app.toLowerCase().replace(/ /g, '');
	return kubeutil.service.deleteService(
		ns,
		_schema.api.split('/')[1].toLowerCase())
		.then(_ => {
			logger.debug(JSON.stringify(_));
			if (_.statusCode != 200 && _.statusCode != 202 && _.statusCode != 404) {
				let errorMsg = _ && _.body && _.body.message ? _.body.message : 'K8s API returned ' + _.statusCode;
				logger.error(errorMsg);
				return Error(errorMsg);
			} return _;
		})
		.catch(_ => {
			logger.error('Error deleting service');
			logger.debug(JSON.stringify(_));
		});
};


module.exports = e;