let cron = require('node-cron');
let mongoose = require('mongoose');
const { AuthCache } = require('@appveen/ds-auth-cache');

const minutes = 3;
const logger = global.logger;
const authCache = new AuthCache();

function init() {
	cron.schedule('*/2 * * * *', function () {
		logger.debug('Cron triggered to update entity status');
		mongoose.model('services').find({ status: 'Pending' }, 'status _metadata.lastUpdated')
			.then(services => {
				services.forEach(async (_s) => {
					let status = await authCache.client.del(`DSROUTE:${_s._id}`);
					logger.debug('Removing Route Cache', status, _s.status);

					if (((new Date().getTime() - new Date(_s._metadata.lastUpdated).getTime()) / 1000) > minutes * 60) {
						logger.info('lastupdated ' + new Date(_s._metadata.lastUpdated));
						// logger.info('time pending ' + ((new Date().getTime() - new Date(_s._lastUpdated).getTime()) / 1000));
						logger.info('undeploy flag ' + ((new Date().getTime() - new Date(_s._lastUpdated).getTime()) / 1000) > minutes * 60);
						return mongoose.model('services').findOneAndUpdate({ '_id': _s._id, '_metadata.deleted': false }, { status: 'Undeployed' })
							.then(() => logger.info('Undeploying ' + _s._id + ' because of some issues'))
							.catch(err => {
								logger.error(err.message);
							});
					}
				});
			})
			.catch(err => {
				logger.error(err);
			});
	});

}
module.exports = init;
