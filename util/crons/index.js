// let imageCleanCron = require('./imageCleanCron');
let entityStatusCron = require('./entityStatusCron');
function init(){
	// imageCleanCron();
	entityStatusCron();
}
module.exports = init;