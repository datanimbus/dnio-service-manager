// const { generateYaml } = require('../../util/codegen/v2/generateYaml');
const { generateYaml } = require('../../util/codegen/v3/generateOpenapi3');
const logger = global.logger;
const mongoose = require('mongoose');
const apiNotAllowed = ['/file/upload', '/file/{id}/view', '/file/{id}/remove', '/fileMapper/mapping', '/fileMapper/create', '/hook', '/lock', '/utils/experienceHook', '/fileMapper/enrich', '/health/live', '/health/ready', '/fileMapper/{fileId}/create', '/fileMapper/{fileId}/mapping', '/fileMapper/{fileId}/count', '/fileMapper/{fileId}', '/fileMapper/{fileId}/enrichDataForWF', '/utils/fileTransfers/{id}', '/utils/fileTransfers/count', '/utils/fileTransfers', '/utils/hrefUpdate', '/utils/securedFields', '/utils/fileTransfers/{fileId}/readStatus'];
const definitionNotAllowed = ['mapping', 'bulkCreateData'];

function getSwagger(req, res) {
	let txnId = req.get('TxnId');
	let id = req.swagger.params.id.value;
	logger.debug(`[${txnId}] Fetching Swagger API documentation for service :: ${id}`);
	mongoose.model('services').findOne({ '_id': id, '_metadata.deleted': false })
		.then( doc => {
			if(!doc) {
				logger.error(`[${txnId}] Service not found :: ${id}`);
				res.status(404).json({message: 'Service not found'});
				return;
			}
			doc = doc.toObject();
			let swagger = generateYaml(doc);
			logger.info(`[${txnId}] Generated swagger :: ${id}`);
			apiNotAllowed.forEach(_k => delete swagger.paths[_k]);
			definitionNotAllowed.forEach(_k => delete swagger.components['schemas'][_k]);
			res.status(200).json(swagger);
		})
		.catch(err => {
			logger.error(`[${txnId}] Error generating swagger doc :: ${err.stack}`);
			res.status(500).json({message: err.message});
		});
}

module.exports = {
	getSwagger
};