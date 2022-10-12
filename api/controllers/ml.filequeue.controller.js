'use strict';
const envConfig = require('../../config/config');
const logger = global.logger;

const authorDBName = envConfig.mongoOptions.dbName;

var e = {};

e.create = async (req, res) => {
	let app = req.params.app;
	let data = req.body;
	logger.debug(`ML :: Creating file entry for app ${app} :: document ${data.documentId}/${data.fileId}`);
	logger.trace(`ML :: Queue data :: ${JSON.stringify(data)}`);
	try {
		let response = await global.mongoDB.collection('ml.filequeue').insertOne(data);
		logger.debug(`ML :: Created file entry for app ${app} :: document ${data.documentId}/${data.fileId} :: ${response.insertedId}`);
		res.end();
	} catch (err) {
		logger.trace(err);
		if (!res.headersSent) {
			res.status(500).json({
				message: err.message
			});
		}
	}
}

module.exports = e;