const fs = require(`fs`);
const path = require(`path`);
const mkdirp = require(`mkdirp`);
const jsyaml = require(`js-yaml`);
const del = require(`del`);
const copydir = require(`copy-dir`);

const envConfig = require(`../../../config/config`);

const { generateDefinition } = require(`./createDefinition`);
const { packageJson, dockerFile, dotEnvFile } = require(`./tempfiles`);
const { generateYaml } = require(`./generateYaml`);
const specialFieldsGenrator = require(`./special-fields-generator`);


const logger = global.logger;

/**
 * 
 * @param {*} config The Service Document
 */
function generateFiles(config) {
	logger.debug(`config >> `);
	logger.debug(config);
	config.idDetails = config[`definition`][`_id`];
	if (config.idDetails.counter && isNaN(config.idDetails.counter)) throw new Error(`Counter is not valid`);
	if (config.idDetails.counter != null) config.idDetails.counter = parseInt(config.idDetails.counter);
	if (config.idDetails.padding && isNaN(config.idDetails.padding)) throw new Error(`Padding is not valid`);
	if (config.idDetails.padding != null) config.idDetails.padding = parseInt(config.idDetails.padding);
	config[`definitionWithId`] = JSON.parse(JSON.stringify(config[`definition`]));
	config.projectName = config._id;
	config.path = `./generatedServices/` + config.projectName;
	delete config[`definition`][`_id`];
	return generateFolderStructure(config)
		.then(() => generateDefinition(config))
		.then((definition) => fs.writeFileSync(path.join(config.path, `api/helpers/service.definition.js`), definition, `utf-8`))
		.then(() => fs.writeFileSync(path.join(config.path, `.env`), dotEnvFile(config), `utf-8`))
		.then(() => fs.writeFileSync(path.join(config.path, `package.json`), packageJson(config), `utf-8`))
		.then(() => fs.writeFileSync(path.join(config.path, `Dockerfile`), dockerFile(config), `utf-8`))
		.then(() => fs.writeFileSync(path.join(config.path, `api/swagger/swagger.yaml`), jsyaml.safeDump(generateYaml(config)), `utf-8`))
		.then(() => fs.writeFileSync(path.join(config.path, `api/utils/special-fields.utils.js`), specialFieldsGenrator.genrateCode(config), `utf-8`))
		.then(() => {
			logger.info(`Your project structure is ready`);
		})
		.catch(err => {
			logger.error(err);
			del(config.path);
			throw err;
		});
}


/**
 * 
 * @param {*} config The Service Document
 */
function generateFolderStructure(config) {
	mkdirp.sync(config.path);
	mkdirp.sync(path.join(config.path, `api/controllers`));
	mkdirp.sync(path.join(config.path, `api/models`));
	mkdirp.sync(path.join(config.path, `api/helpers`));
	mkdirp.sync(path.join(config.path, `api/utils`));
	mkdirp.sync(path.join(config.path, `api/swagger`));
	if (!envConfig.isK8sEnv()) {
		logger.info(`Local ENV :: Copying Structure`);
		copydir.sync(path.join(process.cwd(), `../odp-base/api`), path.join(config.path, `api`));
		fs.copyFileSync(path.join(process.cwd(), `../odp-base/.dockerignore`), path.join(config.path, `.dockerignore`));
		fs.copyFileSync(path.join(process.cwd(), `../odp-base/.gitignore`), path.join(config.path, `.gitignore`));
		fs.copyFileSync(path.join(process.cwd(), `../odp-base/app.js`), path.join(config.path, `app.js`));
		fs.copyFileSync(path.join(process.cwd(), `../odp-base/config.js`), path.join(config.path, `config.js`));
		fs.copyFileSync(path.join(process.cwd(), `../odp-base/http-client.js`), path.join(config.path, `http-client.js`));
		fs.copyFileSync(path.join(process.cwd(), `../odp-base/init.js`), path.join(config.path, `init.js`));
		fs.copyFileSync(path.join(process.cwd(), `../odp-base/queue.js`), path.join(config.path, `queue.js`));
		fs.copyFileSync(path.join(process.cwd(), `../odp-base/db-factory.js`), path.join(config.path, `db-factory.js`));
	}
	return Promise.resolve();
}


module.exports.generateFiles = generateFiles;