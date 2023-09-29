'use strict';
const dataStackutils = require('@appveen/data.stack-utils');
let debugDB = false;
if (process.env.LOG_LEVEL == 'DB_DEBUG') { process.env.LOG_LEVEL = 'debug'; debugDB = true; }

let logger = global.logger;

const dataStackNS = process.env.DATA_STACK_NAMESPACE;
if (isK8sEnv() && !dataStackNS) throw new Error('DATA_STACK_NAMESPACE not found. Please check your configMap');

if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
	dataStackutils.kubeutil.check()
		.then(
			() => logger.info('Connection to Kubernetes API server successful!'),
			_e => {
				logger.error('ERROR :: Unable to connect to Kubernetes API server');
				logger.log(_e.message);
			});
}

let dockerRegistryType = process.env.DOCKER_REGISTRY_TYPE ? process.env.DOCKER_REGISTRY_TYPE : '';
if (dockerRegistryType.length > 0) dockerRegistryType = dockerRegistryType.toUpperCase();

let dockerReg = process.env.DOCKER_REGISTRY_SERVER ? process.env.DOCKER_REGISTRY_SERVER : '';
if (dockerReg.length > 0 && !dockerReg.endsWith('/') && dockerRegistryType != 'ECR') dockerReg += '/';

// TO DO
function mongoUrl() {
	let mongoUrl = process.env.MONGO_AUTHOR_URL || 'mongodb://localhost';
	return mongoUrl;
}

function isK8sEnv() {
	return process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT;
}


function get(_service) {
	if (isK8sEnv()) {
		if (_service == 'dm') return `http://dm.${dataStackNS}`;
		if (_service == 'ne') return `http://ne.${dataStackNS}`;
		if (_service == 'sm') return `http://sm.${dataStackNS}`;
		if (_service == 'bm') return `http://bm.${dataStackNS}`;
		if (_service == 'user') return `http://user.${dataStackNS}`;
		if (_service == 'gw') return `http://gw.${dataStackNS}`;
		if (_service == 'wf') return `http://wf.${dataStackNS}`;
		if (_service == 'sec') return `http://sec.${dataStackNS}`;
		if (_service == 'mon') return `http://mon.${dataStackNS}`;
		if (_service == 'gw') return `http://gw.${dataStackNS}`;
	} else {
		if (_service == 'dm') return 'http://localhost:10709';
		if (_service == 'ne') return 'http://localhost:10010';
		if (_service == 'sm') return 'http://localhost:10003';
		if (_service == 'bm') return 'http://localhost:10011';
		if (_service == 'user') return 'http://localhost:10004';
		if (_service == 'gw') return 'http://localhost:9080';
		if (_service == 'wf') return 'http://localhost:10006';
		if (_service == 'sec') return 'http://localhost:10007';
		if (_service == 'mon') return 'http://localhost:10005';
		if (_service == 'gw') return 'http://localhost:9080';
	}
}

function isCosmosDB() {
	let val = process.env.COSMOS_DB;
	if (typeof val === 'boolean') return val;
	else if (typeof val === 'string') {
		return process.env.COSMOS_DB.toLowerCase() === 'true';
	} else {
		return false;
	}
}

let allowedExtArr = ['ppt', 'xls', 'csv', 'doc', 'jpg', 'png', 'apng', 'gif', 'webp', 'flif', 'cr2', 'orf', 'arw', 'dng', 'nef', 'rw2', 'raf', 'tif', 'bmp', 'jxr', 'psd', 'zip', 'tar', 'rar', 'gz', 'bz2', '7z', 'dmg', 'mp4', 'mid', 'mkv', 'webm', 'mov', 'avi', 'mpg', 'mp2', 'mp3', 'm4a', 'oga', 'ogg', 'ogv', 'opus', 'flac', 'wav', 'spx', 'amr', 'pdf', 'epub', 'exe', 'swf', 'rtf', 'wasm', 'woff', 'woff2', 'eot', 'ttf', 'otf', 'ico', 'flv', 'ps', 'xz', 'sqlite', 'nes', 'crx', 'xpi', 'cab', 'deb', 'ar', 'rpm', 'Z', 'lz', 'msi', 'mxf', 'mts', 'blend', 'bpg', 'docx', 'pptx', 'xlsx', '3gp', '3g2', 'jp2', 'jpm', 'jpx', 'mj2', 'aif', 'qcp', 'odt', 'ods', 'odp', 'xml', 'mobi', 'heic', 'cur', 'ktx', 'ape', 'wv', 'wmv', 'wma', 'dcm', 'ics', 'glb', 'pcap', 'dsf', 'lnk', 'alias', 'voc', 'ac3', 'm4v', 'm4p', 'm4b', 'f4v', 'f4p', 'f4b', 'f4a', 'mie', 'asf', 'ogm', 'ogx', 'mpc'];
let allowedExt = process.env.ALLOWED_FILE_TYPES ? process.env.ALLOWED_FILE_TYPES.split(',') : allowedExtArr;

module.exports = {
	baseUrlSM: get('sm') + '/sm',
	baseUrlNE: get('ne') + '/ne',
	mongoUrl: mongoUrl(),
	baseUrlUSR: get('user') + '/rbac',
	baseUrlMON: get('mon') + '/mon',
	baseUrlWF: get('wf') + '/workflow',
	baseUrlSEC: get('sec') + '/sec',
	baseUrlDM: get('dm') + '/dm',
	baseUrlBM: get('bm') + '/bm',
	baseUrlGW: get('gw') + '/gw',
	debugDB: debugDB,
	mongoAppcenterUrl: process.env.MONGO_APPCENTER_URL || 'mongodb://localhost:27017',
	validationApi: get('user') + '/rbac/validate',
	isK8sEnv: isK8sEnv,
	isCosmosDB: isCosmosDB,
	logQueueName: 'systemService',
	dataStackNS: dataStackNS,
	defaultTimezone: process.env.TZ_DEFAULT || 'Zulu',
	fsMount: process.env.DS_FS_MOUNT_PATH || '/tmp/ds',
	streamingConfig: {
		url: process.env.STREAMING_HOST || 'nats://127.0.0.1:4222',
		user: process.env.STREAMING_USER || '',
		pass: process.env.STREAMING_PASS || '',
		// maxReconnectAttempts: process.env.STREAMING_RECONN_ATTEMPTS || 500,
		// reconnectTimeWait: process.env.STREAMING_RECONN_TIMEWAIT_MILLI || 500
		maxReconnectAttempts: process.env.STREAMING_RECONN_ATTEMPTS || 500,
		connectTimeout: 2000,
		stanMaxPingOut: process.env.STREAMING_RECONN_TIMEWAIT_MILLI || 500
	},
	mongoOptions: {
		// reconnectTries: process.env.MONGO_RECONN_TRIES,
		// reconnectInterval: process.env.MONGO_RECONN_TIME_MILLI,
		dbName: process.env.MONGO_AUTHOR_DBNAME || 'datastackConfig',
		useNewUrlParser: true
	},
	mongoLogsOptions: {
		// reconnectTries: process.env.MONGO_RECONN_TRIES,
		// reconnectInterval: process.env.MONGO_RECONN_TIME_MILLI,
		dbName: process.env.MONGO_LOGS_DBNAME || 'datastackLogs',
		useNewUrlParser: true
	},
	mongoAppcenterOptions: {
		// numberOfRetries: process.env.MONGO_RECONN_TRIES,
		// retryMiliSeconds: process.env.MONGO_RECONN_TIME_MILLI,
		useNewUrlParser: true
	},
	enableSearchIndex: (process.env.DS_FUZZY_SEARCH && process.env.DS_FUZZY_SEARCH.toLowerCase() === 'true') || false,
	allowedExt,
	maxHeapSize: process.env.NODE_MAX_HEAP_SIZE || '4096',
	healthTimeout: process.env.K8S_DS_HEALTH_API_TIMEOUT ? parseInt(process.env.K8S_DS_HEALTH_API_TIMEOUT) : 60,
	RBAC_JWT_KEY: process.env.RBAC_JWT_KEY || 'u?5k167v13w5fhjhuiweuyqi67621gqwdjavnbcvadjhgqyuqagsduyqtw87e187etqiasjdbabnvczmxcnkzn',
	envkeysForDataService: [
		'FQDN',
		'GOOGLE_API_KEY',
		'HOOK_CONNECTION_TIMEOUT',
		'HOOK_RETRY',
		'LOG_LEVEL',
		'MODE',
		'MONGO_APPCENTER_URL',
		'MONGO_AUTHOR_DBNAME',
		'MONGO_AUTHOR_URL',
		'MONGO_LOGS_DBNAME',
		'MONGO_LOGS_URL',
		'MONGO_RECONN_TIME_MILLI',
		'MONGO_RECONN_TRIES',
		'MONGO_CONNECTION_MIN_POOL_SIZE',
		'MONGO_CONNECTION_MAX_POOL_SIZE',
		'MONGO_CONNECTION_MAX_IDLE_TIME',
		'STREAMING_CHANNEL',
		'STREAMING_HOST',
		'STREAMING_PASS',
		'STREAMING_RECONN_ATTEMPTS',
		'STREAMING_RECONN_TIMEWAIT_MILLI',
		'STREAMING_USER',
		'DATA_STACK_NAMESPACE',
		'CACHE_CLUSTER',
		'CACHE_HOST',
		'CACHE_PORT',
		'RELEASE',
		'TLS_REJECT_UNAUTHORIZED',
		'API_REQUEST_TIMEOUT',
		'TZ_DEFAULT',
		'MAX_JSON_SIZE',
		'API_LOGS_METHODS',
		'ML_FILE_PARSER'
	],
	baseImage: `${dockerReg}datanimbus.io.base:${process.env.IMAGE_TAG}`,
	isAcceptableK8sStatusCodes: statusCode => {
		if (statusCode < 400) return true;
		if (statusCode == 409) return true; // 409 means the k8s resource already exists.
		return false;
	}
};