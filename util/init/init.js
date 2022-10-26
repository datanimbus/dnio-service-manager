
let startActiveEntity = require('./startActiveEntity');
// let request = require('request');
// let envConfig = require('../../config/config');
const mongoose = require('mongoose');
let logger = global.logger;
let release = process.env.RELEASE;

// function checkDependency() {
// 	var options = {
// 		url: envConfig.baseUrlDM + '/health',
// 		method: 'GET',
// 		headers: {
// 			'Content-Type': 'application/json'
// 		},
// 		json: true
// 	};
// 	return new Promise((resolve, reject) => {
// 		request(options, function (err, res, body) {
// 			if (err) {
// 				logger.error(err.message);
// 				reject(err);
// 			} else if (!res) {
// 				logger.error('Server is DOWN');
// 				reject(new Error('Server is down'));
// 			}
// 			else {
// 				if (res.statusCode >= 200 && res.statusCode < 400) {
// 					logger.info('Connected to DM');
// 					resolve();
// 				} else {
// 					logger.debug(res.statusCode);
// 					logger.debug(body);
// 					reject(new Error('Request returned ' + res.statusCode));
// 				}
// 			}
// 		});
// 	});
// }

function fixServiceinNewRelease(successIds) {
	logger.info('Fixing services in new release.');
	if (!release) return Promise.resolve();
	return mongoose.model('services').find({ $and: [{ '_metadata.version.release': { $ne: release } }, { 'definition': { $exists: true } }] })
		.then(data => {
			logger.info('Services to fix - ', data && data.length);
			logger.trace(`Services details - ${JSON.stringify(data)}`);
			var count = 0;
			var promises = data.map(doc => {
				// let definitionObject = JSON.parse(doc.definition);
				let idAttribute = doc.definition.find(attr => attr.key == '_id');
				if (!(idAttribute && (idAttribute.isPermanentDelete !== true || idAttribute.isPermanentDelete !== false))) {
					logger.info('something wrong here with id attribute');
					return Promise.resolve();
				}
				if (doc.permanentDeleteData == true || doc.permanentDeleteData == false) return Promise.resolve();
				// let newDefinition = JSON.parse(JSON.stringify(doc.definition));
				let newDefinition = doc.definition.map(def => {
					if (def.key == '_id')
						delete def.isPermanentDelete;
					return def;
				});
				// delete newDefinition._id.isPermanentDelete;
				logger.debug({ 'service is': doc._id });
				return mongoose.model('services').updateOne({ '_id': doc._id }, { $set: { 'permanentDeleteData': idAttribute.isPermanentDelete, 'definition': JSON.stringify(newDefinition), '_metadata.version.release': release } })
					.then(_d => {
						logger.debug({ _d });
						count++;
					})
					.catch(err => {
						logger.error(err);
					});
			});
			return Promise.all(promises)
				.then(() => {
					logger.info('Total number of services updated ' + count);
					return mongoose.model('services').updateMany({ _id: { '$in': successIds } }, { '_metadata.version.release': process.env.RELEASE });
				});
		});
}

async function init() {
	startActiveEntity();
	let successIds = await require('./rebuildCode').init();
	logger.debug('Succes IDs ', JSON.stringify(successIds));
	fixServiceinNewRelease(successIds);
}

module.exports = init;