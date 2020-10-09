let mongoose = require(`mongoose`);
let envConfig = require(`../../config/config`);
let k8s = require(`../k8s`);
let deployUtil = require(`../../api/deploy/deploymentUtil`);
let logger = global.logger;
const BATCH = 5;

function redeploy(services, successIds, i) {
	logger.info(`Running batch ` + (i + 1));
	let promises = services.map(_srvc => {
		logger.debug(`Redeploying ` + _srvc._id);
		let srvcDoc = _srvc;
		if(!srvcDoc.definition) return Promise.resolve();
		return k8s.deploymentDelete(srvcDoc.toObject())
			.then(_d => {
				logger.info(`Deployment deleted`);
				logger.debug(_d);
				return k8s.serviceDelete(srvcDoc.toObject());
			})
			.then(_d => {
				logger.info(`Service deleted`);
				logger.debug(_d);
				srvcDoc = srvcDoc.toObject();
				srvcDoc.definition = JSON.parse(srvcDoc.definition);
				return k8s.serviceStart(srvcDoc);
			})
			.then(_d => {
				logger.info(`Service started`);
				logger.debug(_d);
				if (srvcDoc.status === `Active`)
					return deployUtil.deployService(srvcDoc, null, null, false, false);
			})
			.then(_d => {
				successIds.push(srvcDoc._id);
				logger.debug({successIds});
				logger.debug(_d);
			})
			.catch(err => {
				logger.error(err);
			});
	});
	return Promise.all(promises);
}

function init() {
	let successIds = [];
	if (process.env.RELEASE && envConfig.isK8sEnv()) {
		return mongoose.model(`services`).find({ '_metadata.version.release': { '$ne': process.env.RELEASE } })
			.then(_services => {
				logger.info(`Rebuilding code for ` + _services.map(_d => _d._id));
				var arrays = [],
					size = BATCH;
				while (_services.length > 0) {
					arrays.push(_services.splice(0, size));
				}
				return arrays.reduce((_p, arr, i) => {
					return _p.then(() => redeploy(arr, successIds, i));
				}, Promise.resolve());
			})
			.then(() => {
				logger.debug(`Update Query`);
				logger.debug({ _id: { '$in': successIds } });
				//return mongoose.model('services').updateMany({ _id: { '$in': successIds } }, { '_metadata.version.release': process.env.RELEASE });
				return successIds;
			})
			.catch(err => {
				logger.error(err.message);
			});
	}
}

module.exports = { init };