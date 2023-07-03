'use strict';
// const { generateYaml } = require('../../util/codegen/projectSkeletons/generateYaml');
const { generateYaml } = require('../../util/generateYaml');
const { generateYamlSchemaFree } = require('../../util/generateYamlSchemaFree');
const logger = global.logger;
const mongoose = require('mongoose');
const jsyaml = require('js-yaml');
const apiNotAllowed = ['/file/upload', '/file/{id}/view', '/file/{id}/remove', '/fileMapper/mapping', '/fileMapper/create', '/hook', '/lock', '/utils/experienceHook', '/fileMapper/enrich', '/health/live', '/health/ready', '/fileMapper/{fileId}/create', '/fileMapper/{fileId}/mapping', '/fileMapper/{fileId}/count', '/fileMapper/{fileId}', '/fileMapper/{fileId}/enrichDataForWF', '/utils/fileTransfers/{id}', '/utils/fileTransfers/count', '/utils/fileTransfers', '/utils/hrefUpdate', '/utils/securedFields', '/utils/fileTransfers/{fileId}/readStatus'];
const definitionNotAllowed = ['mapping', 'bulkCreateData'];
function addAuthHeader(paths, jwt) {
	Object.keys(paths).forEach(path => {
		Object.keys(paths[path]).forEach(method => {
			if (typeof paths[path][method] == 'object' && paths[path][method]['parameters']) {
				let authObj = paths[path][method]['parameters'].find(obj => obj.name == 'authorization');
				if (authObj) authObj.default = jwt;
			}
		});
	});
}

function show(req, res) {
	let txnId = req.get('TxnId');
	let id = req.params.id;
	logger.debug(`[${txnId}] Fetching Swagger API documentation for service :: ${id}`);
	mongoose.model('services').findOne({ '_id': id, '_metadata.deleted': false })
		.then(_d => {
			if (!_d) {
				logger.error(`[${txnId}] Service not found :: ${id}`);
				res.status(404).json({ message: 'Service not found' });
				return;
			}
			_d = _d.toObject();
			let swagger = {};
			if (_d.schemaFree) swagger = generateYamlSchemaFree(_d);
			else swagger = generateYaml(_d);
			swagger.host = req.query.host;
			logger.debug(`[${txnId}] Swagger host :: ${swagger.host}`);
			swagger.basePath = req.query.basePath ? req.query.basePath : swagger.basePath;
			logger.debug(`[${txnId}] Swagger basePath :: ${swagger.basePath}`);
			apiNotAllowed.forEach(_k => delete swagger.paths[_k]);
			if (!_d.schemaFree) definitionNotAllowed.forEach(_k => delete swagger.components.schemas[_k]);
			addAuthHeader(swagger.paths, req.query.token);

			if (req.query.type == 'yaml') {
				res.set('Content-Type', 'text/yaml');
				res.set('Content-Disposition', 'attachment; filename=swagger.yaml');
				res.status(200).send(jsyaml.dump(swagger));
			} else {
				res.status(200).json(swagger);
			}
		})
		.catch(err => {
			logger.error(`[${txnId}] Error generating swagger doc :: ${err.message}`);
			res.status(500).json({ message: err.message });
		});
}

module.exports = {
	show: show
};