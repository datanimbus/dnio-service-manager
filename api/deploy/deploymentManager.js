'use strict';

const fs = require('fs');
const request = require('request');

const schemaFreeGen = require('../../util/schemaFreeGen');
const codeGen = require('../../util/codegen/v2');
const config = require('../../config/config.js');
const fileIO = require('../../util/codegen/lib/fileIO.js');

const deploymentUrlCreate = config.baseUrlDM + '/deployment';
const deploymentUrlUpdate = config.baseUrlDM + '/updateDeployment';
const deploymentApiChange = config.baseUrlDM + '/apiChange';
const logger = global.logger;

function generateFiles(txnId, schema) {
	if (schema.schemaFree) {
		return schemaFreeGen.generateFiles(txnId, schema);
	} else {
		return codeGen.generateFiles(txnId, schema);
	}
}

var e = {};
e.deployService = (txnId, schema, _isUpdate, _oldData) => {
	const id = schema._id;
	logger.info(`[${txnId}] Deploying service to DM :: ${id}`);

	var deploymentUrl;
	var envObj = {};

	return new Promise((resolve, reject) => {
		generateFiles(txnId, schema)
			.then(() => {
				var envKeys = [
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
					'MONGO_CONNECTION_POOL_SIZE',
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
					'STORAGE_ENGINE',
					'STORAGE_AZURE_CONNECTION_STRING',
					'STORAGE_AZURE_CONTAINER',
					'STORAGE_AZURE_SHARED_KEY',
					'STORAGE_AZURE_TIMEOUT'
				];

				for (var i in envKeys) {
					var val = envKeys[i];
					envObj[val] = process.env[val];
				}

				envObj['DATA_STACK_APP_NS'] = (config.dataStackNS + '-' + schema.app).toLowerCase();
				envObj['NODE_OPTIONS'] = `--max-old-space-size=${config.maxHeapSize}`;
				envObj['NODE_ENV'] = 'production';
				envObj['SERVICE_ID'] = `${schema._id}`;

				logger.trace(`[${txnId}] Environment variables to send to DM ${id} :: ${JSON.stringify(envObj)}`);

				var formData = {
					deployment: JSON.stringify({
						image: id,
						imagePullPolicy: 'Always',
						namespace: config.dataStackNS + '-' + schema.app,
						port: schema.port,
						name: (schema.api).substring(1),
						version: schema.version,
						envVars: envObj,
						volumeMounts: {
							'file-export': {
								containerPath: '/app/output',
								hostPath: `${config.fsMount}/${id}`
							}
						},
						options: {
							livenessProbe: {
								httpGet: {
									path: '/' + schema.app + '/' + schema.api + '/utils/health/live',
									port: schema.port,
									scheme: 'HTTP'
								},
								initialDelaySeconds: 5,
								timeoutSeconds: config.healthTimeout
							},
							readinessProbe: {
								httpGet: {
									path: '/' + schema.app + '/' + schema.api + '/utils/health/ready',
									port: schema.port,
									scheme: 'HTTP'
								},
								initialDelaySeconds: 5,
								timeoutSeconds: config.healthTimeout
							}
						}
					}),
					oldDeployment: JSON.stringify(_oldData),
					file: fs.createReadStream(`./generatedServices/${id}_${schema.version}.zip`),
				};
				logger.debug(`[${txnId}] Uploading service to DM :: ${id}`);

				if (_oldData) deploymentUrl = deploymentApiChange;
				else if (_isUpdate) deploymentUrl = deploymentUrlUpdate;
				else deploymentUrl = deploymentUrlCreate;

				logger.debug(`[${txnId}] DM deployment URL :: ${deploymentUrl}`);

				return request.post({ url: deploymentUrl, formData: formData }, function (err, httpResponse, body) {
					if (err) {
						logger.error(`[${txnId}] DM deployment upload failed for service ${id} :: ${err.message}`);
						return reject(err);
					}
					if (httpResponse.statusCode >= 400) {
						let errorMsg = body && body.message ? body.message : 'DM returned statusCode ' + httpResponse.statusCode;
						logger.error(`[${txnId}] DM responded with error :: ${errorMsg}`);
						return reject(new Error(errorMsg));
					}

					logger.info(`[${txnId}] Upload to DM successful! :: Deployment process queued in DM for service ${id}`);
					logger.trace(`[${txnId}] Deployment queued DM response for service ${id} :: ${JSON.stringify(body)}`);

					fileIO.deleteFolderRecursive('./generatedServices/' + id);
					fileIO.removeFile('./generatedServices/' + id + '_1.zip');
					resolve('Process queued in DM');
				});
			})
			.catch(e => {
				logger.error(`[${txnId}] Error deploying service to DM :: ${id} :: ${e.message}`);
				reject(e);
			});
	});
};

module.exports = e;
