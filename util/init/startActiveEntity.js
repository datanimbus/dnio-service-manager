let mongoose = require('mongoose');
const kubeutil = require('@appveen/data.stack-utils').kubeutil;
let dm = require('../../api/deploy/deploymentUtil');
let config = require('../../config/config');
let logger = global.logger;
function createNSifNotExist(_txnId, ns) {
	return kubeutil.namespace.getNamespace(ns)
		.then(_d => {
			if (_d && _d.statusCode >= 200 && _d.statusCode < 400) return _d;
			return kubeutil.namespace.createNamespace(ns)
				.then(_ => {
					if (_.statusCode != 200 || _.statusCode != 202) {
						logger.error(`[${_txnId}] CheckNS :: Error :: ${_.message}`);
						logger.trace(`[${_txnId}] CheckNS :: Error :: ${JSON.stringify(_)}`);
						return Error(_.message);
					}
					return _;
				});
		});
}

function startEntityifStop(_txnId, _schemaDetails) {
	let id = _schemaDetails._id;
	logger.info(`[${_txnId}] Check and starting :: ${id}`);
	let ns = `${config.dataStackNS}-${_schemaDetails.app}`.toLowerCase();
	let deploymentName = _schemaDetails.api.split('/')[1].toLowerCase();
	return createNSifNotExist(_txnId, ns)
		.then(() => kubeutil.deployment.getDeployment(ns, deploymentName))
		.then(_d => {
			if (!_d || (_d && _d.statusCode != 404)) return;
			return dm.deployService(_txnId, _schemaDetails, false, false);
		})
		.then(() => logger.info(`[${_txnId}] Check and starting :: ${id} :: Deployment started`))
		.catch(err => logger.error(`[${_txnId}] Check and starting :: ${id} :: ${err.message}`));
}

function init() {
	let txnId = 'SM-StartIfStopped';
	setTimeout(() => {
		logger.info(`[${txnId}] Starting data services which are not running in k8s`);
		if (config.isK8sEnv()) {
			mongoose.model('services').find({ 'status': 'Active' })
				.then(services => {
					let promises = services.map(_s => startEntityifStop(txnId, _s));
					return Promise.all(promises);
				})
				.catch(err => {
					logger.error(`[${txnId}] ERROR :: ${err.message}`);
				});
		}
	}, 1000 * 60);

}


module.exports = init;