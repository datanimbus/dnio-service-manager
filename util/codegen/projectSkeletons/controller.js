
const writeFile = require(`../lib/fileIO.js`).writeFile;
const logger = global.logger;
const controllerTemplate = require(`./templates/controller.main.template.js`);
const _ = require(`lodash`);
function createController(config){
	var _id = _.camelCase(config._id);
	var controllerJs = controllerTemplate(_id,config);
	let path = config.path+`/api/controllers/${_id}.controller.js`;
	return writeFile(path,controllerJs)
		.then(() => logger.info(`${_id}.controller.js created with the suggested configurations`));
}
module.exports.createController = createController;