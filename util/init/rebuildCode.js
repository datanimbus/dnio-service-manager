let mongoose = require('mongoose');
let envConfig = require('../../config/config');
let k8s = require('../k8s');
let deployUtil = require('../../api/deploy/deploymentUtil');
let logger = global.logger;
const BATCH = 5;

function redeploy(services, successIds, i) {
	let reqObject = {
		headers: {
			'txnId': `SM-Redeploy-${i+1}`
		}
	};
	let txnId = `SM-Redeploy-${i+1}`; 
	logger.info(`[${txnId}] Redeploying services :: Running batch ${(i + 1)}`);
	let promises = services.map(_srvc => {
		logger.debug(`[${txnId}] Redeploying service ${_srvc._id}`);
		let srvcDoc = _srvc;
		if(!srvcDoc.definition) {
			logger.info(`[${txnId}] Redeploying service :: ${srvcDoc._id} :: No definition found. Ignoring`);
			return Promise.resolve();
		}
		return k8s.deploymentDelete(srvcDoc.toObject())
			.then(_d => {
				logger.info(`[${txnId}] Deployment deleted :: ${srvcDoc._id}`);
				logger.trace(`[${txnId}] Deployment delete response - ${JSON.stringify(_d)}`);
				return k8s.serviceDelete(srvcDoc.toObject());
			})
			.then(_d => {
				logger.info(`[${txnId}] Service deleted :: ${srvcDoc._id}`);
				logger.trace(`[${txnId}] Service delete response - ${JSON.stringify(_d)}`);
				srvcDoc = srvcDoc.toObject();
				// srvcDoc.definition = JSON.parse(srvcDoc.definition);
				return k8s.serviceStart(srvcDoc);
			})
			.then(_d => {
				logger.info(`[${txnId}] Service started :: ${srvcDoc._id}`);
				logger.trace(`[${txnId}] Service start response - ${JSON.stringify(_d)}`);
				if (srvcDoc.status === 'Active')
					return deployUtil.deployService(srvcDoc, null, reqObject, false, false);
			})
			.then(_d => {
				logger.info(`[${txnId}] Deployment started :: ${srvcDoc._id}`);
				logger.trace(`[${txnId}] Deployment start response - ${JSON.stringify(_d)}`);
				successIds.push(srvcDoc._id);
				logger.trace(`[${txnId}] Succeess Ids - ${successIds.join(', ')}`);
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
		return mongoose.model('services').find({ '_metadata.version.release': { '$ne': process.env.RELEASE } })
			.then(_services => {
				logger.info('Rebuilding code for ' + _services.map(_d => _d._id));
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
				logger.debug('Update Query');
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