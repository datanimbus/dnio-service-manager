'use strict';

const writeFile = require('../lib/fileIO.js').writeFile;
const logger = global.logger;
const appJsTemplate = require('./templates/app.template.js');

function createAppjsfile(config){
	var appJs = appJsTemplate(config);
	var path = config.path+'/app.js';
	writeFile(path,appJs)
		.then(() => logger.info('App.js created with the suggested configurations'));
}

module.exports.createAppjsfile = createAppjsfile;