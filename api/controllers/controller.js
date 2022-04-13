const _ = require('lodash');


'use strict';
//controllers
const serviceManagerController = require('./serviceManager.controller.js');
const globalSchemaController = require('./globalSchema.controller.js');
const logsController = require('./logs.controller.js');
const tagsController = require('./tags.controller.js');
const swaggerDocController = require('./swaggerDoc.controller.js');
const serviceAuditController = require('./service.audit.controller.js');
const globalSchemaAuditController = require('./globalSchema.audit.controller.js');

// //exports
// var exports = {};
// exports.serviceManagerVerifyHook = serviceManagerController.verifyHook;
// exports.serviceManagerCreate = serviceManagerController.create;
// exports.serviceManagerList = serviceManagerController.index;
// exports.serviceManagerShow = serviceManagerController.show;
// exports.serviceManagerDestroy = serviceManagerController.destroy;
// exports.serviceManagerUpdate = serviceManagerController.update;
// exports.serviceManagerDraftDelete = serviceManagerController.draftDelete;
// exports.getServiceCount = serviceManagerController.count;
// exports.vishnuDocumentCount = serviceManagerController.documentCount;
// exports.vishnuIdCounter = serviceManagerController.getCounter;
// exports.purgeService = serviceManagerController.purge;
// exports.purgeLogsService = serviceManagerController.purgeLogsService;
// exports.stopAllServices = serviceManagerController.stopAllServices;
// exports.startAllServices = serviceManagerController.startAllServices;
// exports.repairAllServices = serviceManagerController.repairAllServices;
// exports.serviceAudit = serviceAuditController.index;
// exports.health = serviceManagerController.health;
// exports.readiness = serviceManagerController.readiness;
// exports.serviceAuditCount = serviceAuditController.count;
// exports.serviceManagerStatusChange = serviceManagerController.changeStatus;
// exports.serviceManagerStatusChangeFromMaintenance = serviceManagerController.StatusChangeFromMaintenance;
// exports.globalSchemaCreate = globalSchemaController.create;
// exports.globalSchemaList = globalSchemaController.index;
// exports.globalSchemaShow = globalSchemaController.show;
// exports.globalSchemaDestroy = globalSchemaController.destroy;
// exports.globalSchemaUpdate = globalSchemaController.update;
// exports.globalSchemaCount = globalSchemaController.count;
// exports.globalSchemaAudit = globalSchemaAuditController.index;
// exports.globalSchemaAuditCount = globalSchemaAuditController.count;
// exports.validateUserDeletion = serviceManagerController.validateUserDeletion;
// exports.userDeletion = serviceManagerController.userDeletion;

// exports.startService = serviceManagerController.startService;
// exports.stopService = serviceManagerController.stopService;
// exports.deployService = serviceManagerController.deployService;
// exports.repairService = serviceManagerController.repairService;
// exports.deleteApp = serviceManagerController.deleteApp;

// exports.logsControllerList = logsController.index;
// exports.logsControllerCount = logsController.count;
// exports.lockDocumentCount = serviceManagerController.lockDocumentCount;

// exports.swaggerDocShow = swaggerDocController.show;

// exports.tags = tagsController.tags;

// exports.enableCalendar = serviceManagerController.enableCalendar;
// exports.disableCalendar = serviceManagerController.disableCalendar;
// exports.checkUnique = serviceManagerController.checkUnique;
// exports.countByStatus = serviceManagerController.countByStatus;

// exports.serviceManagerShowByName = serviceManagerController.showByName;
// module.exports = exports;


const router = require('express').Router();
router.get('/service', mapSwaggerParams, serviceManagerController.index);
router.post('/service', mapSwaggerParams, serviceManagerController.create);
router.get('/service/verifyHook', mapSwaggerParams, serviceManagerController.verifyHook);
router.get('/service/:id', mapSwaggerParams, serviceManagerController.show);
router.put('/service/:id', mapSwaggerParams, serviceManagerController.update);
router.delete('/service/:id', mapSwaggerParams, serviceManagerController.destroy);
router.get('/service/utils/:app/:name', mapSwaggerParams, serviceManagerController.showByName);
router.get('/service/count', mapSwaggerParams, serviceManagerController.count);
router.get('/service/status/count', mapSwaggerParams, serviceManagerController.countByStatus);
router.get('/service/audit', mapSwaggerParams, serviceAuditController.index);
router.get('/service/audit/count', mapSwaggerParams, serviceAuditController.count);
router.delete('/:id/draftDelete', mapSwaggerParams, serviceManagerController.draftDelete);
router.delete('/:id/purge/all', mapSwaggerParams, serviceManagerController.purge);
router.put('/validateUserDeletion/:app/:userId', mapSwaggerParams, serviceManagerController.validateUserDeletion);
router.put('/userDeletion/:app/:userId', mapSwaggerParams, serviceManagerController.userDeletion);
router.delete('/:id/purge/:type', mapSwaggerParams, serviceManagerController.purgeLogsService);
router.get('/service/:id/swagger', mapSwaggerParams, swaggerDocController.show);
router.put('/service/:id/statusChange', mapSwaggerParams, serviceManagerController.changeStatus);
router.put('/service/:id/statusChangeFromMaintenance', mapSwaggerParams, serviceManagerController.StatusChangeFromMaintenance);
router.get('/service/:id/checkUnique', mapSwaggerParams, serviceManagerController.checkUnique);
router.delete('/app/:app', mapSwaggerParams, serviceManagerController.deleteApp);
router.put('/:app/service/stop', mapSwaggerParams, serviceManagerController.stopAllServices);
router.put('/:app/service/start', mapSwaggerParams, serviceManagerController.startAllServices);
router.put('/:app/service/repair', mapSwaggerParams, serviceManagerController.repairAllServices);
router.get('/globalSchema', mapSwaggerParams, globalSchemaController.index);
router.post('/globalSchema', mapSwaggerParams, globalSchemaController.create);
router.get('/globalSchema/:id', mapSwaggerParams, globalSchemaController.show);
router.put('/globalSchema/:id', mapSwaggerParams, globalSchemaController.update);
router.delete('/globalSchema/:id', mapSwaggerParams, globalSchemaController.destroy);
router.get('/globalSchema/count', mapSwaggerParams, globalSchemaController.count);
router.get('/globalSchema/audit', mapSwaggerParams, globalSchemaAuditController.index);
router.get('/globalSchema/audit/count', mapSwaggerParams, globalSchemaAuditController.count);
router.put('/:id/start', mapSwaggerParams, serviceManagerController.startService);
router.put('/:id/stop', mapSwaggerParams, serviceManagerController.stopService);
router.put('/:id/deploy', mapSwaggerParams, serviceManagerController.deployService);
router.put('/:id/repair', mapSwaggerParams, serviceManagerController.repairService);
router.get('/:id/count', mapSwaggerParams, serviceManagerController.documentCount);
router.get('/:id/:app/idCount', mapSwaggerParams, serviceManagerController.getCounter);
router.put('/calendar/enable', mapSwaggerParams, serviceManagerController.enableCalendar);
router.put('/calendar/disable', mapSwaggerParams, serviceManagerController.disableCalendar);
router.get('/logs', mapSwaggerParams, logsController.index);
router.get('/:id/lockDocument/count', mapSwaggerParams, serviceManagerController.lockDocumentCount);
router.get('/tags', mapSwaggerParams, tagsController.tags);
router.get('/health/live', mapSwaggerParams, serviceManagerController.health);
router.get('/health/ready', mapSwaggerParams, serviceManagerController.readiness);
module.exports = router;


function mapSwaggerParams(req, res, next) {
	const temp = {};
	_.merge(temp, req.params, req.query);
	const params = {};
	// Object.assign(params, req.params, req.query);
	Object.keys(temp).forEach(key => {
		params[key] = { value: temp[key] };
	});
	// logger.debug(req.params, req.query, params);
	req.swagger = {
		params
	};
	next();
}