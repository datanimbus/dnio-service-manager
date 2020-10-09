const writeFile = require(`../lib/fileIO.js`).writeFile;
const logger = global.logger;
const controllerTemplate = require(`./templates/controller.template.js`);
const _ = require(`lodash`);

function centralController(config) {
	var _id = _.camelCase(config._id);
	var controller = controllerTemplate(_id, config._id);
	var path = config.path + `/api/controllers/controller.js`;
	return writeFile(path, controller)
		.then(() => logger.info(`controller.js created with the suggested configurations`));
}

module.exports.centralController = centralController;