const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const jsyaml = require('js-yaml');
const del = require('del');
const copydir = require('copy-dir');

const envConfig = require('../../../config/config');

const { generateDefinition } = require('./createDefinition');
const { dockerFile, dotEnvFile } = require('./tempfiles');
const { generateYaml } = require('./generateYaml');
const specialFieldsGenrator = require('./special-fields-generator');


const logger = global.logger;

/**
 * 
 * @param {*} config The Service Document
 */
function generateFiles(_txnId, config) {
	let id = config._id;
	logger.info(`[${_txnId}] GenerateFiles :: ${id}`);
	logger.trace(`[${_txnId}] GenerateFiles :: ${id} :: Config :: ${JSON.stringify(config)}`);
	config.idDetails = config['definition'].find(attr => attr.key == '_id');
	if (config.idDetails.counter && isNaN(config.idDetails.counter)) throw new Error('Counter is not valid');
	if (config.idDetails.counter != null) config.idDetails.counter = parseInt(config.idDetails.counter);
	if (config.idDetails.padding && isNaN(config.idDetails.padding)) throw new Error('Padding is not valid');
	if (config.idDetails.padding != null) config.idDetails.padding = parseInt(config.idDetails.padding);
	config['definitionWithId'] = JSON.parse(JSON.stringify(config['definition']));
	config.projectName = config._id;
	config.path = './generatedServices/' + config.projectName;
	config['definition'] = config['definition'].filter(attr => attr.key != '_id');
	return generateFolderStructure(_txnId, config)
		.then(() => generateDefinition(_txnId, config))
		.then((definition) => fs.writeFileSync(path.join(config.path, 'api/helpers/service.definition.js'), definition, 'utf-8'))
		.then(() => fs.writeFileSync(path.join(config.path, 'service.json'), JSON.stringify(config), 'utf-8'))
		.then(() => fs.writeFileSync(path.join(config.path, '.env'), dotEnvFile(config), 'utf-8'))
		.then(() => fs.writeFileSync(path.join(config.path, 'Dockerfile'), dockerFile(config), 'utf-8'))
		.then(() => fs.writeFileSync(path.join(config.path, 'api/swagger/swagger.yaml'), jsyaml.safeDump(generateYaml(config)), 'utf-8'))
		.then(() => fs.writeFileSync(path.join(config.path, 'api/utils/special-fields.utils.js'), specialFieldsGenrator.genrateCode(config), 'utf-8'))
		.then(() => logger.info(`[${_txnId}] GenerateFiles :: ${id} :: Your project structure is ready`))
		.catch(err => {
			logger.error(`[${_txnId}] GenerateFiles :: ${id} :: ${err.message}`);
			del(config.path);
			throw err;
		});
}


/**
 * 
 * @param {*} config The Service Document
 */
function generateFolderStructure(_txnId, config) {
	let id = config._id;
	logger.info(`[${_txnId}] GenerateFolderStructure :: ${id}`);

	mkdirp.sync(config.path);
	logger.trace(`[${_txnId}] GenerateFolderStructure :: ${id} :: ${config.path}`);
	
	mkdirp.sync(path.join(config.path, 'api/controllers'));
	logger.trace(`[${_txnId}] GenerateFolderStructure :: ${id} :: ${path.join(config.path, 'api/controllers')}`);
	
	mkdirp.sync(path.join(config.path, 'api/models'));
	logger.trace(`[${_txnId}] GenerateFolderStructure :: ${id} :: ${path.join(config.path, 'api/models')}`);
	
	mkdirp.sync(path.join(config.path, 'api/helpers'));
	logger.trace(`[${_txnId}] GenerateFolderStructure :: ${id} :: ${path.join(config.path, 'api/helpers')}`);
	
	mkdirp.sync(path.join(config.path, 'api/utils'));
	logger.trace(`[${_txnId}] GenerateFolderStructure :: ${id} :: ${path.join(config.path, 'api/utils')}`);

	mkdirp.sync(path.join(config.path, 'output'));
	logger.trace(`[${_txnId}] GenerateFolderStructure :: ${id} :: ${path.join(config.path, 'output')}`);
	
	mkdirp.sync(path.join(config.path, 'api/swagger'));
	logger.trace(`[${_txnId}] GenerateFolderStructure :: ${id} :: ${path.join(config.path, 'api/swagger')}`);
	
	mkdirp.sync(path.join(config.path, 'mongoKeys'));
	logger.trace(`[${_txnId}] GenerateFolderStructure :: ${id} :: ${path.join(config.path, 'mongoKeys')}`);

	let mongoDBKeys = fs.readdirSync(path.join('/', 'mongoKeys'));
	logger.debug(`[${_txnId}] MongoDB Key location :: ${id} :: ${path.join('/', 'mongoKeys')}`);
	mongoDBKeys.forEach(key => {
		if(key.indexOf('pem') != -1) {
			logger.debug(`[${_txnId}] MongoDB Keys :: ${id} :: ${key}`);
			fs.copyFileSync(path.join('/', 'mongoKeys', key), path.join(config.path, 'mongoKeys', key));
			logger.debug(`[${_txnId}] MongoDB Keys copied :: ${id} :: ${path.join('/', 'mongoKeys', key)} -> ${path.join(config.path, 'mongoKeys', key)}`);
		}
	});

	if (!envConfig.isK8sEnv()) {
		logger.info(`[${_txnId}] GenerateFolderStructure :: ${id} :: Local ENV :: Copying Structure`);
		copydir.sync(path.join(process.cwd(), '../ds-base/api'), path.join(config.path, 'api'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/.dockerignore'), path.join(config.path, '.dockerignore'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/.gitignore'), path.join(config.path, '.gitignore'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/app.js'), path.join(config.path, 'app.js'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/config.js'), path.join(config.path, 'config.js'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/http-client.js'), path.join(config.path, 'http-client.js'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/init.js'), path.join(config.path, 'init.js'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/package.json'), path.join(config.path, 'package.json'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/queue.js'), path.join(config.path, 'queue.js'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/db-factory.js'), path.join(config.path, 'db-factory.js'));
	}
	return Promise.resolve();
}


module.exports.generateFiles = generateFiles;