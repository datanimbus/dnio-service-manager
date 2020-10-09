
const { generateDefinition } = require(`../lib/createDefinition.js`);
const fileIO = require(`../lib/fileIO.js`);
const log4js = require(`log4js`);
const logger = log4js.getLogger(`CodeGen`);
const { createAppjsfile } = require(`../projectSkeletons/app.js`);
const { createController } = require(`../projectSkeletons/controller.js`);
const { centralController } = require(`../projectSkeletons/centralController.js`);
let helperUtil = require(`../projectSkeletons/util.js`).helperUtil;
const { publishYaml } = require(`../projectSkeletons/generateYaml.js`);
const { generateFolderStructure } = require(`../projectSkeletons/createProjectStructure`);
var bulkUploadController = require(`../projectSkeletons/templates/controller.bulkUpload.template`);

var e = {};
e.startProcessing = function (config) {
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
		.then(() => fileIO.writeFile(config.path + `/api/helpers/util.js`, helperUtil(config)))
		.then(() => fileIO.writeFile(config.path + `/api/controllers/bulkUpload.controller.js`, bulkUploadController(config)))
		.then(() => createAppjsfile(config))
		.then(() => createController(config))
		.then(() => centralController(config))
		.then(() => publishYaml(config))
		.then(() => {
			logger.info(`Your project structure is ready`);
		})
		.catch(err => {
			logger.error(err);
			fileIO.deleteFolderRecursive(config.path);
			throw err;
		});
};

module.exports = e;
// e.startProcessing(config);