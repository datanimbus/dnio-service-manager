'use strict';

// const codeGen = require(`../../util/codegen/bin/codeGenerator.js`);
const codeGen = require(`../../util/codegen/v2`);
const config = require(`../../config/config.js`);
const logger = global.logger;
const zipFolder = require(`folder-zip-sync`);
const fileIO = require(`../../util/codegen/lib/fileIO.js`);
const deploymentUrlCreate = config.baseUrlDM + `/deployment`;
const deploymentUrlUpdate = config.baseUrlDM + `/updateDeployment`;
const deploymentApiChange = config.baseUrlDM + `/apiChange`;
const fs = require(`fs`);
const request = require(`request`);
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
				var envKeys = [`COSMOS_DB`, `FQDN`, `GOOGLE_API_KEY`, `HOOK_CONNECTION_TIMEOUT`, `HOOK_RETRY`, `LOG_LEVEL`, `MODE`, `MONGO_APPCENTER_URL`, `MONGO_AUTHOR_DBNAME`, `MONGO_AUTHOR_URL`, `MONGO_LOGS_DBNAME`, `MONGO_LOGS_URL`, `MONGO_RECONN_TIME`, `MONGO_RECONN_TRIES`, `NATS_HOST`, `NATS_PASS`, `NATS_RECONN_ATTEMPTS`, `NATS_RECONN_TIMEWAIT`, `NATS_USER`, `ODP_NAMESPACE`, `ODPENV`, `REDIS_HOST`, `REDIS_PORT`, `RELEASE`, `TLS_REJECT_UNAUTHORIZED`, `API_REQUEST_TIMEOUT`];
				var envObj = {};
				for (var i in envKeys) {
					var val = envKeys[i];
					envObj[val] = process.env[val];
				}
				envObj[`ODP_APP_NS`] = (config.odpNS + `-` + _schema.app).toLowerCase();
				envObj[`NODE_OPTIONS`] = `--max-old-space-size=${config.maxHeapSize}`;
				envObj[`SERVICE_ID`] = `${_schema._id}`;
				envObj[`SERVICE_PORT`] = `${_schema.port}`;
				_schema.api = (_schema.api).substring(1);
				zipFolder(`./generatedServices/` + id, `./generatedServices/` + id + `_` + _schema.version + `.zip`);
				var formData = {
					deployment: JSON.stringify({
						image: id,
						imagePullPolicy: `Always`,
						namespace: config.odpNS + `-` + _schema.app,
						port: _schema.port,
						name: _schema.api,
						version: _schema.version,
						envVars: envObj,
						volumeMounts: {
							'file-export': {
								containerPath: `/app/output`,
								hostPath: `${config.fsMount}/${id}`
							}
						},
						options: {
							livenessProbe: {
								httpGet: {
									path: `/` + _schema.app + `/` + _schema.api + `/health/live`,
									port: _schema.port,
									scheme: `HTTP`
								},
								initialDelaySeconds: 5,
								timeoutSeconds: config.healthTimeout
							},
							readinessProbe: {
								httpGet: {
									path: `/` + _schema.app + `/` + _schema.api + `/health/ready`,
									port: _schema.port,
									scheme: `HTTP`
								},
								initialDelaySeconds: 5,
								timeoutSeconds: config.healthTimeout
							}
						}
					}),
					oldDeployment: JSON.stringify(_oldData),
					file: fs.createReadStream(`./generatedServices/` + id + `_` + _schema.version + `.zip`),
				};

				request.post({ url: deploymentUrl, formData: formData }, function (err, httpResponse, body) {
					if (err) {
						logger.error(`upload failed:`, err);
						return reject(err);
					}
					if (httpResponse.statusCode >= 400) {
						let errorMsg = body && body.message ? body.message : `DM returned statusCode ` + httpResponse.statusCode;
						logger.error(errorMsg);
						return reject(new Error(errorMsg));
					}
					logger.info(`Upload successful!  Server responded with:`, body);
					fileIO.deleteFolderRecursive(`./generatedServices/` + id);
					fileIO.removeFile(`./generatedServices/` + id + `_1.zip`);
					resolve(`Process queued in DM`);
				});
			})
			.catch(e => reject(e));
	});
};

module.exports = e;