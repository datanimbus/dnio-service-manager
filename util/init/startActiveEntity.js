let mongoose = require('mongoose');
const kubeutil = require('@appveen/odp-utils').kubeutil;
let deploymentUtil = require('../../api/deploy/deploymentUtil');
let globalDefHelper = require('../../api/helpers/util/globalDefinitionHelper');
let dm = require('../../api/deploy/deploymentManager');
let config = require('../../config/config');
let logger = global.logger;
function createNSifNotExist(ns) {
	return kubeutil.namespace.getNamespace(ns)
		.then(_d => {
			if (_d && _d.statusCode >= 200 && _d.statusCode < 400) {
				return _d;
			} else {
				return kubeutil.namespace.createNamespace(ns)
					.then(_ => {
						if (_.statusCode != 200 || _.statusCode != 202) {
							logger.error(_.message);
							logger.debug(JSON.stringify(_));
							return Error(_.message);
						}
						return _;
					});
			}
		});
}

function startEntityifStop(_schemaDetails) {
	let ns = _schemaDetails.app.toLowerCase().replace(/ /g, '');
	let deploymentName = _schemaDetails.api.split('/')[1].toLowerCase();
	return createNSifNotExist(ns)
		.then(() => kubeutil.deployment.getDeployment(ns, deploymentName))
		.then(_d => {
			if (!_d || (_d && _d.statusCode != 404)) {
				return;
			}
			let systemFields = {
				'File': [],
				'Geojson': []
			};
			deploymentUtil.getSystemFields(systemFields, '', _schemaDetails.definition, ['File', 'Geojson']);
			_schemaDetails.definition = globalDefHelper.expandSchemaWithSystemGlobalDef(_schemaDetails.definition);
			_schemaDetails.geoJSONFields = systemFields.Geojson;
			_schemaDetails.fileFields = systemFields.File;
			return dm.deployService(_schemaDetails, false, false);
		})
		.then(() => {
			logger.info(deploymentName + ' deployment started in ' + ns);
		})
		.catch(err=>{
			logger.error(err.message);
		});
}

function init() {
	setTimeout(() => {
		logger.info('-------Starting Active Entities-------');
		if(config.isK8sEnv()){
			mongoose.model('services').find({ 'status': 'Active' })
				.then(services => {
					let promises = services.map(_s => startEntityifStop(_s));
					return Promise.all(promises);
				})
				.catch(err => {
					logger.error(err.message);
				});
		}
	}, 1000 * 60);

}


module.exports = init;