'use strict';

const log4js = require('log4js');
const express = require('express');
const bluebird = require('bluebird');
const mongoose = require('mongoose');
const socket = require('socket.io');
const upload = require('express-fileupload');
const JWT = require('jsonwebtoken');

const cuti = require('@appveen/utils');

let version = require('./package.json').version;

const loggerName = process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT ? `[${process.env.DATA_STACK_NAMESPACE}] [${process.env.HOSTNAME}] [SM ${version}]` : `[SM ${version}]`;
const logger = log4js.getLogger(loggerName);
logger.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';
global.logger = logger;

const envConfig = require('./config/config.js');
const { fetchEnvironmentVariablesFromDB } = require('./config/config');

let timeOut;
global.Promise = bluebird;

const token = JWT.sign({ name: 'SM_TOKEN', _id: 'admin', isSuperAdmin: true }, envConfig.RBAC_JWT_KEY);
global.SM_TOKEN = token;

const app = express();


(async () => {
	try {
		// let mongoAppcenterUrl = envConfig.mongoAppcenterUrl;
		let dbAppcenterUrl = envConfig.dbAppcenterUrl;

		// let authorDBName = envConfig.mongoOptions.dbName;
		let dbAuthorDBName = envConfig.dbAuthorOptions.dbName;

		logger.debug('DB Author Type', envConfig.dbAuthorType);
		logger.debug('DB Author URL', envConfig.dbAuthorUrl);
		logger.debug('DB Author Options', envConfig.dbAuthorOptions);

		await mongoose.connect(envConfig.dbAuthorUrl, envConfig.dbAuthorOptions);
		logger.info(`Connected to ${dbAuthorDBName} DB`);
		logger.trace(`Connected to URL: ${mongoose.connection.host}`);
		logger.trace(`Connected to DB:${mongoose.connection.name}`);
		logger.trace(`Connected via User: ${mongoose.connection.user}`);

		mongoose.connection.on('connecting', () => {
			logger.info(dbAuthorDBName + ' DB connecting');
		});
		mongoose.connection.on('disconnected', () => {
			logger.error(dbAuthorDBName + ' DB lost connection');
		});
		mongoose.connection.on('reconnect', () => {
			logger.info(dbAuthorDBName + ' DB reconnected');
		});
		mongoose.connection.on('connected', () => {
			logger.info(dbAuthorDBName + ' DB connected');
		});
		mongoose.connection.on('reconnectFailed', () => {
			logger.error(dbAuthorDBName + ' DB failed to reconnect');
		});

		global.mongoDB = mongoose.connection;
		global.authorDBConnection = mongoose.connection;

		// MongoClient.connect(mongoAppcenterUrl, envConfig.mongoAppcenterOptions, (error, db) => {
		// 	if (error) logger.error(error.message);
		// 	if (db) {
		// 		global.mongoConnection = db;
		// 		logger.info('Connected to Appcenter');
		// 		db.on('connecting', () => {
		// 			logger.info('Appcenter connecting');
		// 		});
		// 		db.on('close', () => {
		// 			logger.error('Appcenter lost connection');
		// 		});
		// 		db.on('reconnect', () => {
		// 			logger.info('Appcenter reconnected');
		// 		});
		// 		db.on('connected', () => {
		// 			logger.info('Appcenter connected');
		// 		});
		// 		db.on('reconnectFailed', () => {
		// 			logger.error('Appcenter failed to reconnect');
		// 		});
		// 	}
		// });

		// MongoClient.connect(dbAppcenterUrl, envConfig.dbAppcenterOptions, (error, db) => {
		// 	if (error) logger.error('Error connecting to appcenter', error.message);
		// 	if (db) {
		// 		global.mongoConnection = db;
		// 		global.appcenterDBConnection = db;
		// 		logger.info('Connected to Appcenter');
		// 		db.on('connecting', () => {
		// 			logger.info('Appcenter connecting');
		// 		});
		// 		db.on('close', () => {
		// 			logger.error('Appcenter lost connection');
		// 		});
		// 		db.on('reconnect', () => {
		// 			logger.info('Appcenter reconnected');
		// 		});
		// 		db.on('connected', () => {
		// 			logger.info('Appcenter connected');
		// 		});
		// 		db.on('reconnectFailed', () => {
		// 			logger.error('Appcenter failed to reconnect');
		// 		});
		// 	}
		// });

		logger.info('DB Appcenter Type', envConfig.dbAppcenterType);
		logger.info('DB Appcenter URL', envConfig.dbAppcenterUrl);
		logger.debug('DB Appcenter Options', envConfig.dbAppcenterOptions);
		await mongoose.createConnection(envConfig.dbAppcenterUrl, envConfig.dbAppcenterOptions);

		global.mongoConnection = mongoose.connections[1];
		global.dbAppcenterConnection = mongoose.connections[1];
		logger.info('Connected to Appcenter DB');

		// After MongoDB is connected, fetch environment variables
		const envVariables = await fetchEnvironmentVariablesFromDB();
		timeOut = envVariables.API_REQUEST_TIMEOUT || 120;

		initialize();
		require('./util/init/fixDataService')();
	} catch (err) {
		logger.error(err);
	}
})();


function initialize() {
	app.use(express.json({
		limit: '5mb'
	}));

	app.use(upload({ useTempFiles: true }));

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
			process.stdout.write(',' + proj + ')\n');
		} else {
			process.stdout.write(')\n');
		}
	}

	if (envConfig.debugDB) mongoose.set('debug', customLogger);

	// mongoose.set('useFindAndModify', false);

	function initSocket(server) {
		const io = socket(server);
		app.set('socket', io);
		logger.info('Initializing socket connection');
		io.on('connection', function (socket) {
			logger.info('Connection accepted from : ' + socket.id);
		});
	}


	var logMiddleware = cuti.logMiddleware.getLogMiddleware(logger);
	app.use(logMiddleware);

	// Running cron jobs
	require('./util/crons')();

	let dataStackutils = require('@appveen/data.stack-utils');
	let queueMgmt = require('./util/queueMgmt');
	dataStackutils.eventsUtil.setNatsClient(queueMgmt.client);
	var logToQueue = dataStackutils.logToQueue('sm', queueMgmt.client, envConfig.logQueueName, 'sm.logs');
	app.use(logToQueue);

	// if(global.mongoConnection){
	if (global.authorDBConnection) {
		require('./api/init/init')();
	} else {
		setTimeout(() => {
			require('./api/init/init')();
		}, 2000);
	}

	app.use(require('./util/auth'));

	app.use('/sm', require('./api/controllers/controller'));

	app.use(function (error, req, res, next) {
		if (error) {
			logger.error(error);
			if (!res.headersSent) {
				let statusCode = error.statusCode || 500;
				if (error.message.includes('APP_NAME_ERROR')) {
					statusCode = 400;
				}
				res.status(statusCode).json({
					message: error.message
				});
			}
		} else {
			next();
		}
	});

	const port = process.env.PORT || 10003;
	const server = app.listen(port, (err) => {
		if (!err) {
			logger.info('Server started on port ' + port);
		} else
			logger.error(err);
	});
	server.setTimeout(parseInt(timeOut) * 1000);
	initSocket(server);
}
