'use strict';

// const codeGen = require(`../../util/codegen/bin/codeGenerator.js`);
const codeGen = require('../../util/codegen/v2');
const config = require('../../config/config.js');
const logger = global.logger;
const zipFolder = require('folder-zip-sync');
const fileIO = require('../../util/codegen/lib/fileIO.js');
const deploymentUrlCreate = config.baseUrlDM + '/deployment';
const deploymentUrlUpdate = config.baseUrlDM + '/updateDeployment';
const deploymentApiChange = config.baseUrlDM + '/apiChange';
const fs = require('fs');
const request = require('request');
var e = {};
e.deployService = (_schema, _isUpdate, _oldData) => {
	const id = _schema._id;
	var deploymentUrl;
	return new Promise((resolve, reject) => {
		// codeGen.startProcessing(_schema)
		codeGen.generateFiles(_schema)
			.then(_ => logger.info(_))
			.then(() => {
				if (_oldData) {
					deploymentUrl = deploymentApiChange;
				}
				else if (_isUpdate) {
					deploymentUrl = deploymentUrlUpdate;
				}
				else {
					deploymentUrl = deploymentUrlCreate;
				}
				var envKeys = ['FQDN', 'GOOGLE_API_KEY', 'HOOK_CONNECTION_TIMEOUT', 'HOOK_RETRY', 'LOG_LEVEL', 'MODE', 'MONGO_APPCENTER_URL', 'MONGO_AUTHOR_DBNAME', 'MONGO_AUTHOR_URL', 'MONGO_LOGS_DBNAME', 'MONGO_LOGS_URL', 'MONGO_RECONN_TIME_MILLI', 'MONGO_RECONN_TRIES', 'STREAMING_CHANNEL', 'STREAMING_HOST', 'STREAMING_PASS', 'STREAMING_RECONN_ATTEMPTS', 'STREAMING_RECONN_TIMEWAIT_MILLI', 'STREAMING_USER', 'DATA_STACK_NAMESPACE', 'CACHE_CLUSTER', 'CACHE_HOST', 'CACHE_PORT', 'RELEASE', 'TLS_REJECT_UNAUTHORIZED', 'API_REQUEST_TIMEOUT'];
				var envObj = {};
				for (var i in envKeys) {
					var val = envKeys[i];
					envObj[val] = process.env[val];
				}
				envObj['DATA_STACK_APP_NS'] = (config.dataStackNS + '-' + _schema.app).toLowerCase();
				envObj['NODE_OPTIONS'] = `--max-old-space-size=${config.maxHeapSize}`;
				envObj['SERVICE_ID'] = `${_schema._id}`;
				envObj['SERVICE_PORT'] = `${_schema.port}`;
				_schema.api = (_schema.api).substring(1);
				logger.debug('zipping folder for id ', id);
				try {
					if(fs.existsSync('./generatedServices/' + id)) {
						logger.info('Directory ::', JSON.stringify(fs.readdirSync('./generatedServices/' + id)))
					} else {
						logger.error('Directory doesn\'t exist.');
					}
					zipFolder('./generatedServices/' + id, './generatedServices/' + id + '_' + _schema.version + '.zip');
				} catch (e) {
					logger.error('Error in creating zip folder :: ', e);
				}
				logger.debug('folder zipped for id : ', id);
				var formData = {
					deployment: JSON.stringify({
						image: id,
						imagePullPolicy: 'Always',
						namespace: config.dataStackNS + '-' + _schema.app,
						port: _schema.port,
						name: _schema.api,
						version: _schema.version,
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
									path: '/' + _schema.app + '/' + _schema.api + '/health/live',
									port: _schema.port,
									scheme: 'HTTP'
								},
								initialDelaySeconds: 5,
								timeoutSeconds: config.healthTimeout
							},
							readinessProbe: {
								httpGet: {
									path: '/' + _schema.app + '/' + _schema.api + '/health/ready',
									port: _schema.port,
									scheme: 'HTTP'
								},
								initialDelaySeconds: 5,
								timeoutSeconds: config.healthTimeout
							}
						}
					}),
					oldDeployment: JSON.stringify(_oldData),
					file: fs.createReadStream('./generatedServices/' + id + '_' + _schema.version + '.zip'),
				};
				logger.debug('Calling DM for deployment with formData:: ', JSON.stringify(formData));
				request.post({ url: deploymentUrl, formData: formData }, function (err, httpResponse, body) {
					if (err) {
						logger.error('upload failed:', err);
						return reject(err);
					}
					if (httpResponse.statusCode >= 400) {
						let errorMsg = body && body.message ? body.message : 'DM returned statusCode ' + httpResponse.statusCode;
						logger.error(errorMsg);
						return reject(new Error(errorMsg));
					}
					logger.info('Upload successful!  Server responded with:', body);
					fileIO.deleteFolderRecursive('./generatedServices/' + id);
					fileIO.removeFile('./generatedServices/' + id + '_1.zip');
					resolve('Process queued in DM');
				});
			})
			.catch(e => {
				logger.error('Error in deployService :: ', e);
				reject(e);
			});
	});
};

module.exports = e;