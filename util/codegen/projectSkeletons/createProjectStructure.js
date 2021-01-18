const fs = require('fs');
const fileIO = require('../lib/fileIO');
const logger = global.logger;
const tempFiles = require('./templates/tempfiles.js');
const gitIgnore = tempFiles.gitIgnore();
const _config = tempFiles.config();
const eslint = tempFiles.esLint();
const webHookConfig = tempFiles.webHookConfig();
const crudderHelper = tempFiles.crudderHelper();

function generateFolderStructure(config) {
	var packageJson = tempFiles.packageJson(config);
	var logsController = tempFiles.logsController(config);
	const queueManagement = tempFiles.queueManagement(config);
	var preHooksController = tempFiles.preHooksController();
	// var auditController = tempFiles.auditController(config);
	// var webHookStatusController = tempFiles.webHookStatusController(config);
	var dockerFile = tempFiles.dockerFile(config.port);
	// var bulkUploadController = require('./templates/controller.bulkUpload.template.js')(config);
	var path = config.path;
	let logsDefinition = tempFiles.logsDefinition(config);
	let bulkCreateDefinition = tempFiles.bulkCreateDefinition(config);
	let exportDefinition = tempFiles.exportDefinition(config);
	// let preHooksDefinition = tempFiles.preHooksDefinition();
	// let auditLogsDefinition = tempFiles.auditLogsDefinition(config);
	// let helperUtil = tempFiles.helperUtil(config);
	const initFile = tempFiles.initFile(config);
	try {
		fileIO.deleteFolderRecursive(path);
		fs.mkdirSync(path);
		fs.mkdirSync(path + '/api');
		fs.mkdirSync(path + '/config');
		fs.mkdirSync(path + '/test');
		fs.mkdirSync(path + '/output');
		fs.mkdirSync(path + '/api/controllers');
		fs.mkdirSync(path + '/api/helpers');
		fs.mkdirSync(path + '/api/mocks');
		fs.mkdirSync(path + '/api/swagger');
		fs.mkdirSync(path + '/api/uploads');
		return fileIO.writeFile(path + '/.gitignore', gitIgnore)
			.then(() => fileIO.writeFile(path + '/.eslintrc.yml', eslint))
			.then(() => fileIO.writeFile(path + '/config/default.yaml', _config))
			.then(() => fileIO.writeFile(path + '/package.json', packageJson))
			.then(() => fileIO.writeFile(path + '/Dockerfile', dockerFile))
			.then(() => fileIO.writeFile(path + '/queueManagement.js', queueManagement))
			.then(() => fileIO.writeFile(path + '/config.js', webHookConfig))
			.then(() => fileIO.writeFile(path + '/api/controllers/logs.controller.js', logsController))
			.then(() => fileIO.writeFile(path + '/api/controllers/preHooks.controller.js', preHooksController))
			// .then(() => fileIO.writeFile(path + '/api/controllers/audit.controller.js', auditController))
			// .then(() => fileIO.writeFile(path + '/api/controllers/webHookStatus.controller.js', webHookStatusController))
			// .then(() => fileIO.writeFile(path + '/api/controllers/bulkUpload.controller.js', bulkUploadController))
			.then(() => fileIO.writeFile(path + '/api/helpers/logs.definition.js', logsDefinition))
			.then(() => fileIO.writeFile(path + '/api/helpers/bulkCreate.definition.js', bulkCreateDefinition))
			.then(() => fileIO.writeFile(path + '/api/helpers/bulkAction.definition.js', exportDefinition))
			// .then(() => fileIO.writeFile(path + '/api/helpers/preHooks.definition.js', preHooksDefinition))
			// .then(() => fileIO.writeFile(path + '/api/helpers/auditLogs.definition.js', auditLogsDefinition))
			.then(() => fileIO.writeFile(path + '/api/helpers/crudder.js', crudderHelper))
			// .then(() => fileIO.writeFile(path + '/api/helpers/util.js', helperUtil))
			.then(() => fileIO.writeFile(path + '/init.js', initFile))
			.then(() => logger.info('Project Structure Created'));
	} catch (e) {
		logger.error(e);
		throw e;
	}

}


module.exports.generateFolderStructure = generateFolderStructure;