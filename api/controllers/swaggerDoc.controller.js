'use strict';
const { generateYaml } = require('../../util/codegen/projectSkeletons/generateYaml');
const logger = global.logger;
const mongoose = require('mongoose');
const apiNotAllowed = ['/file/upload', '/file/{id}/view', '/file/{id}/remove', '/fileMapper/mapping', '/fileMapper/create', '/hook', '/lock', '/experienceHook', '/fileMapper/enrich', '/health/live', '/health/ready', '/fileMapper/{fileId}/create', '/fileMapper/{fileId}/mapping', '/fileMapper/{fileId}/count', '/fileMapper/{fileId}', '/fileMapper/{fileId}/enrichDataForWF', '/utils/fileTransfers/{id}', '/utils/fileTransfers/count', '/utils/fileTransfers', '/utils/hrefUpdate'];
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
	let id = req.swagger.params.id.value;
	mongoose.model('services').findOne({ '_id': id, '_metadata.deleted': false })
		.then(_d => {
			if (!_d) {
				res.status(400).json({ message: 'Service not found' });
				return;
			}
			_d = _d.toObject();
			let swagger = generateYaml(_d);
			swagger.host = req.query.host;
			swagger.basePath = req.query.basePath ? req.query.basePath : swagger.basePath;
			apiNotAllowed.forEach(_k => delete swagger.paths[_d.api + '' + _k]);
			definitionNotAllowed.forEach(_k => delete swagger.definitions[_k]);
			addAuthHeader(swagger.paths, req.query.token);
			res.status(200).json(swagger);
		})
		.catch(err => {
			logger.error(err.message);
			res.status(500).json({ message: err.message });
		});
}

module.exports = {
	show: show
};