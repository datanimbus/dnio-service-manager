const envConfig = require('../../../../config/config.js');
module.exports = function (config) {
	var appJs = `
"use strict";
const fs = require('fs');
const path = require('path');
const jsyaml = require('js-yaml');
const swaggerTools = require('swagger-tools');
const app = require("express")();
let debugDB = false;
if(process.env.LOG_LEVEL=='DB_DEBUG' ){process.env.LOG_LEVEL = 'debug'; debugDB = true;}
const cuti = require("@appveen/utils");
const log4js = cuti.logger.getLogger;
const conf= require('./config.js');
let fileValidator = cuti.fileValidator;
const mongodb = require('mongodb');
const mongo = mongodb.MongoClient;
let loggerName = ${envConfig.isK8sEnv()} ? \`[\${process.env.ODP_APP_NS}]\` + \`[\${process.env.HOSTNAME}]\` : "[${config.name}]"
const logger = log4js.getLogger(loggerName);
const bluebird = require("bluebird");
const mongoose = require("mongoose");
const fileUpload = require('express-fileupload');
global.Promise = bluebird;
global.logger = logger;
global.serverStartTime = new Date();
const disableInsights = ${config.disableInsights}

const odpUtils = require("@appveen/odp-utils");
var bodyParser = require('body-parser');
var checkLiveness = require('./api/helpers/util');

let timeOut = process.env.API_REQUEST_TIMEOUT || 120;
let mongoUrl = process.env.MONGO_APPCENTER_URL || "mongodb://localhost";

let URL = require("url");
const validationApi = "${envConfig.validationApi}";
global.status = null;

let init = require("./init")
const loglevel = "${process.env.LOG_LEVEL}";

if(debugDB) mongoose.set("debug", true);
let dbName = '${process.env.DATA_STACK_NAMESPACE}-${config.app}';
let options = {
    reconnectTries: conf.mongoOptions.reconnectTries,
    reconnectInterval: conf.mongoOptions.reconnectInterval,
    dbName: dbName,
    useNewUrlParser: true
};

const logsDB = process.env.MONGO_LOGS_DBNAME || 'odpLogs';
const configDB = process.env.MONGO_LOGS_DBNAME || 'odpConfig';

mongo.connect(conf.mongoLogUrl, { db: {
    numberOfRetries: conf.mongoOptions.reconnectTries,
    retryMiliSeconds: conf.mongoOptions.reconnectInterval
}, useNewUrlParser: true }, (error, db) => {
	if (error) logger.error(error.message);
	if (db) {
		global.mongoDBLogs = db.db(logsDB);
		logger.info('Connected to Logs DB');
		db.on('connecting', () => { logger.info('-------------------------\${logsDB} connecting-------------------------'); });
		db.on('close', () => { logger.error('-------------------------\${logsDB} lost connection-------------------------'); });
		db.on('reconnect', () => { logger.info('-------------------------\${logsDB} reconnected-------------------------'); });
		db.on('connected', () => { logger.info('Connected to \${logsDB} DB'); });
		db.on('reconnectFailed', () => { logger.error('-------------------------\${logsDB} failed to reconnect-------------------------'); });
	}
});

mongoose.connect(mongoUrl,options, err =>{
    if(err){
        logger.error(err);
    }
    else{
        logger.info("Connected to ${process.env.DATA_STACK_NAMESPACE}-${config.app} DB");
        global.gfsBucket = new mongodb.GridFSBucket(mongoose.connection.db, { bucketName: '${config.collectionName}' });
        global.gfsBucketExport = new mongodb.GridFSBucket(mongoose.connection.db, { bucketName: '${config.collectionName}.exportedFile' });
        global.gfsBucketImport = new mongodb.GridFSBucket(mongoose.connection.db, { bucketName: '${config.collectionName}.fileImport' });
    }
});

mongoose.connection.on('connecting', () => {logger.info(\`-------------------------\${dbName} connecting-------------------------\`); });
mongoose.connection.on('disconnected', () => { logger.error(\`-------------------------\${dbName} lost connection-------------------------\`); });
mongoose.connection.on('reconnect', () => { logger.info(\`-------------------------\${dbName} reconnected-------------------------\`); });
mongoose.connection.on('connected', () => { logger.info(\`Connected to \${dbName} DB\`); });
mongoose.connection.on('reconnectFailed', () => { logger.error(\`-------------------------\${dbName} failed to reconnect-------------------------\`); });

let serviceId = process.env.SERVICE_ID || '${config._id}';

app.use(bodyParser.json({ limit: "5mb" }));


var logMiddleware = cuti.logMiddleware.getLogMiddleware(logger);
app.use(logMiddleware);

app.use(fileUpload());

let liveness = checkLiveness.checkLiveness();
app.use(liveness);

let queueMgmt = require('./queueManagement.js');

let secureFields = '${config.secureFields}'.split(',').map(_d=>_d+'.value');
let baseURL = '${'/' + config.app + config.api}';
let masking = [
	{ url: \`\${baseURL}\`, path: secureFields },
    { url: \`\${baseURL}/utils/simulate\`, path: secureFields },
    { url: \`\${baseURL}/{id}\`, path: secureFields },
	{ url: \`\${baseURL}/utils/experienceHook\`, path: secureFields }
];

app.use((req, res, next) => {
	if(disableInsights) next();
	else {
		let logToQueue = odpUtils.logToQueue('${config.app}.${config.collectionName}', queueMgmt.client, "dataService", '${config.app}.${config.collectionName}.logs', masking,'${config._id}');
		logToQueue(req, res, next);
	}
		 
});

function getFileValidatorMiddleware(req, res, next){
    let allowedExt = conf.allowedExt || [];
    if(!req.files) return next();
    let flag = Object.keys(req.files).every(file => {
        let filename = req.files[file].name;
		let fileExt = filename.split('.').pop();
		if (allowedExt.indexOf(fileExt.toLowerCase()) == -1) return false;
		(fileExt == 'jpeg') ? fileExt='jpg' : (fileExt == 'webm') ? fileExt='mkv': fileExt;
        let isValid = fileValidator({ type: 'Buffer', data: req.files[file].data }, fileExt.toLowerCase());
        return isValid;
    });
    if (flag) next();
    else next(new Error('File not supported'));
};

app.use(getFileValidatorMiddleware);

// swaggerRouter configuration
var swaggerOptions = {
	swaggerUi: path.join(__dirname, '/swagger.json'),
	controllers: path.join(__dirname, './api/controllers'),
	useStubs: process.env.NODE_ENV === 'development' // Conditionally turn on stubs (mock mode)
};

// The Swagger document (require it, build it programmatically, fetch it from a URL, ...)
var spec = fs.readFileSync(path.join(__dirname, 'api/swagger/swagger.yaml'), 'utf8');
var swaggerDoc = jsyaml.safeLoad(spec);

swaggerTools.initializeMiddleware(swaggerDoc, function (middleware) {

	// Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
	app.use(middleware.swaggerMetadata());

	// Validate Swagger requests
	app.use(middleware.swaggerValidator());

	// Route validated requests to appropriate controller
	app.use(middleware.swaggerRouter(swaggerOptions));

	// Serve the Swagger documents and Swagger UI
	// app.use(middleware.swaggerUi());

	// Start the server
	var port = parseInt(process.env.SERVICE_PORT) || ${config.port};
	var server = app.listen(port, (err) => {
		if (!err) {
            logger.info('Server started on port ' + port);
            if(!${envConfig.isK8sEnv()}) init();
			app.use((err, req, res, next) => {
				if (err) {
					if (!res.headersSent)
						return res.status(500).json({ message: err.message });
					return;
				}
				next();
			});
		} else
			logger.error(err);
	});
	server.setTimeout(parseInt(timeOut) * 1000);
});
    `;
	return appJs;
};