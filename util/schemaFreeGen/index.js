const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const jsyaml = require('js-yaml');
const del = require('del');
const copydir = require('copy-dir');

const config = require('../../config/config');
const { dockerFile, dotEnvFile } = require('./tempFiles');
const { generateYaml } = require('./generateYaml');

const logger = global.logger;

function generateFiles(txnId, serviceDetails) {
    let id = serviceDetails._id;

    logger.info(`[${txnId}] Generating files for schema free Service ${id}`);
    logger.trace(`[${txnId}] Generating files for service ${id} :: serviceDetails :: ${JSON.stringify(serviceDetails)}`);

	serviceDetails.idDetails = serviceDetails['definition'].find(attr => attr.key == '_id');
	if (serviceDetails.idDetails.counter && isNaN(serviceDetails.idDetails.counter)) throw new Error('Counter is not valid');
	if (serviceDetails.idDetails.counter != null) serviceDetails.idDetails.counter = parseInt(serviceDetails.idDetails.counter);
	if (serviceDetails.idDetails.padding && isNaN(serviceDetails.idDetails.padding)) throw new Error('Padding is not valid');
	if (serviceDetails.idDetails.padding != null) serviceDetails.idDetails.padding = parseInt(serviceDetails.idDetails.padding);
	serviceDetails['definitionWithId'] = JSON.parse(JSON.stringify(serviceDetails['definition']));
	serviceDetails['definition'] = serviceDetails['definition'].filter(attr => attr.key != '_id');
	
    serviceDetails.projectName = serviceDetails._id;
	serviceDetails.path = './generatedServices/' + serviceDetails.projectName;
    const yamlJSON = generateYaml(serviceDetails);
	const yamlDump = jsyaml.dump(yamlJSON);
    
    return generateFolderStructure(txnId, serviceDetails)
		.then(() => fs.writeFileSync(path.join(serviceDetails.path, 'service.json'), JSON.stringify(serviceDetails), 'utf-8'))
		.then(() => fs.writeFileSync(path.join(serviceDetails.path, '.env'), dotEnvFile(serviceDetails), 'utf-8'))
		.then(() => fs.writeFileSync(path.join(serviceDetails.path, 'Dockerfile'), dockerFile(serviceDetails), 'utf-8'))
		.then(() => fs.writeFileSync(path.join(serviceDetails.path, 'api/swagger/swagger.yaml'), yamlDump, 'utf-8'))
		.then(() => logger.info(`[${txnId}] Your project structure is ready ${id}`))
		.catch(err => {
			logger.error(`[${txnId}] Error generating files :: ${id} :: ${err}`);
			del(serviceDetails.path);
			throw err;
		});
}

function generateFolderStructure(txnId, serviceDetails) {
	let id = serviceDetails._id;
	logger.debug(`[${txnId}] Generating folder structure :: ${id}`);

	mkdirp.sync(serviceDetails.path);
	logger.trace(`[${txnId}] Base path :: ${serviceDetails.path}`);

	mkdirp.sync(path.join(serviceDetails.path, 'api/controllers'));
	logger.trace(`[${txnId}] Controllers :: ${path.join(serviceDetails.path, 'api/controllers')}`);

	mkdirp.sync(path.join(serviceDetails.path, 'api/models'));
	logger.trace(`[${txnId}] Models :: ${path.join(serviceDetails.path, 'api/models')}`);

	mkdirp.sync(path.join(serviceDetails.path, 'api/helpers'));
	logger.trace(`[${txnId}] Helpers :: ${path.join(serviceDetails.path, 'api/helpers')}`);

	mkdirp.sync(path.join(serviceDetails.path, 'api/utils'));
	logger.trace(`[${txnId}] Utils :: ${path.join(serviceDetails.path, 'api/utils')}`);

	mkdirp.sync(path.join(serviceDetails.path, 'output'));
	logger.trace(`[${txnId}] Output :: ${path.join(serviceDetails.path, 'output')}`);

	mkdirp.sync(path.join(serviceDetails.path, 'api/swagger'));
	logger.trace(`[${txnId}] Swagger :: ${path.join(serviceDetails.path, 'api/swagger')}`);

	if (!config.isK8sEnv()) {
		logger.debug(`[${txnId}]  Local ENV :: Copying Structure`);

		copydir.sync(path.join(process.cwd(), '../ds-base/api'), path.join(serviceDetails.path, 'api'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/.dockerignore'), path.join(serviceDetails.path, '.dockerignore'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/.gitignore'), path.join(serviceDetails.path, '.gitignore'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/app.js'), path.join(serviceDetails.path, 'app.js'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/config.js'), path.join(serviceDetails.path, 'config.js'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/http-client.js'), path.join(serviceDetails.path, 'http-client.js'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/init.js'), path.join(serviceDetails.path, 'init.js'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/package.json'), path.join(serviceDetails.path, 'package.json'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/queue.js'), path.join(serviceDetails.path, 'queue.js'));
		fs.copyFileSync(path.join(process.cwd(), '../ds-base/db-factory.js'), path.join(serviceDetails.path, 'db-factory.js'));
	}
	return Promise.resolve();
}

module.exports.generateFiles = generateFiles;
