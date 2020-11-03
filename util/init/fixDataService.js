let mongoose = require('mongoose');
let envConfig = require('../../config/config');
let logger = global.logger;

function init() {
	return mongoose.model('services').updateMany({ 'enableSearchIndex': { $exists: false } }, { 'enableSearchIndex': envConfig.enableSearchIndex }, { multi: true })
		.then(_d => {
			logger.debug('Updating enableSearchIndex in data service ' + JSON.stringify(_d));
		})
		.catch(err => {
			logger.error(err);
		});
}

module.exports = init;