'use strict';
const fs = require('fs');
const path = require('path');
const jsyaml = require('js-yaml');
const swaggerTools = require('swagger-tools');
const app = require('express')();
const cuti = require('@appveen/utils');
const log4js = cuti.logger.getLogger;
const loggerName = process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT && process.env.ODPENV == 'K8s' ? `[${process.env.DATA_STACK_NAMESPACE}] [${process.env.HOSTNAME}]` : '[serviceManager]';
const logger = log4js.getLogger(loggerName);
const bluebird = require('bluebird');
const mongoose = require('mongoose');
const socket = require('socket.io');
const mongo = require('mongodb').MongoClient;
let timeOut = process.env.API_REQUEST_TIMEOUT || 120;
logger.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';
global.Promise = bluebird;
global.logger = logger;
const envConfig = require('./config/config.js');
let mongoAppcenterUrl = envConfig.mongoAppcenterUrl;
var bodyParser = require('body-parser');
app.use(bodyParser.json({
	limit: '5mb'
}));
// let init = require('./util/init/init');
if (envConfig.isK8sEnv()) {
	logger.info('*** K8s environment detected ***');
	logger.info('Image version: ' + process.env.IMAGE_TAG);
	process.env.SM_ENV = 'K8s';
} else {
	logger.info('*** Local environment detected ***');
	process.env.SM_ENV = 'Local';
}

function customLogger(coll, op, doc, proj) {
	process.stdout.write(`Mongoose: ${coll}.${op}(${JSON.stringify(doc)}`);
	if (proj) {
		process.stdout.write(',' + JSON.stringify(proj) + ')\n');
	} else {
		process.stdout.write(')\n');
	}
}

if (envConfig.debugDB) mongoose.set('debug', customLogger);

mongo.connect(mongoAppcenterUrl, {
	db: envConfig.mongoAppcenterOptions,
	useNewUrlParser: true
}, (error, db) => {
	if (error) logger.error(error.message);
	if (db) {
		global.mongoConnection = db;
		logger.info('Connected to Appcenter');
		db.on('connecting', () => {
			logger.info('Appcenter connecting');
		});
		db.on('close', () => {
			logger.error('Appcenter lost connection');
		});
		db.on('reconnect', () => {
			logger.info('Appcenter reconnected');
		});
		db.on('connected', () => {
			logger.info('Appcenter connected');
		});
		db.on('reconnectFailed', () => {
			logger.error('Appcenter failed to reconnect');
		});
	}
});

function initSocket(server) {
	const io = socket(server);
	app.set('socket', io);
	logger.info('Initializing socket connection');
	io.on('connection', function (socket) {
		logger.info('Connection accepted from : ' + socket.id);
	});
}

let authorDBName = envConfig.mongoOptions.dbName;
mongoose.connect(envConfig.mongoUrl, envConfig.mongoOptions, err => {
	if (err) {
		logger.error(err.message);
	} else {
		logger.info(`Connected to ${authorDBName} DB`);
		logger.trace(`Connected to URL: ${mongoose.connection.host}`);
		logger.trace(`Connected to DB:${mongoose.connection.name}`);
		logger.trace(`Connected via User: ${mongoose.connection.user}`);
		require('./util/init/fixDataService')();
	}
});

mongoose.connection.on('connecting', () => {
	logger.info(authorDBName + ' DB connecting');
});
mongoose.connection.on('disconnected', () => {
	logger.error(authorDBName + ' DB lost connection');
});
mongoose.connection.on('reconnect', () => {
	logger.info(authorDBName + ' DB reconnected');
});
mongoose.connection.on('connected', () => {
	logger.info(authorDBName + ' DB connected');
});
mongoose.connection.on('reconnectFailed', () => {
	logger.error(authorDBName + ' DB failed to reconnect');
});


global.mongoDB = mongoose.connection;
var logMiddleware = cuti.logMiddleware.getLogMiddleware(logger);
app.use(logMiddleware);

// Running cron jobs
require('./util/crons')();

let dataStackutils = require('@appveen/data.stack-utils');
let queueMgmt = require('./util/queueMgmt');
dataStackutils.eventsUtil.setNatsClient(queueMgmt.client);
var logToQueue = dataStackutils.logToQueue('sm', queueMgmt.client, envConfig.logQueueName, 'sm.logs');
app.use(logToQueue);

// swaggerRouter configuration
var options = {
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
	app.use(middleware.swaggerRouter(options));

	// Serve the Swagger documents and Swagger UI
	// app.use(middleware.swaggerUi());

	// Start the server
	var port = process.env.PORT || 10003;
	var server = app.listen(port, (err) => {
		if (!err) {
			logger.info('Server started on port ' + port);
		} else
			logger.error(err);
	});
	server.setTimeout(parseInt(timeOut) * 1000);
	initSocket(server);
});