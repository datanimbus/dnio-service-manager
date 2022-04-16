
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
router.get('/service', serviceManagerController.index);
router.post('/service', serviceManagerController.create);
router.get('/service/verifyHook', serviceManagerController.verifyHook);
router.get('/service/:id', serviceManagerController.show);
router.put('/service/:id', serviceManagerController.update);
router.delete('/service/:id', serviceManagerController.destroy);
router.get('/service/utils/:app/:name', serviceManagerController.showByName);
router.get('/service/count', serviceManagerController.count);
router.get('/service/status/count', serviceManagerController.countByStatus);
router.get('/service/audit', serviceAuditController.index);
router.get('/service/audit/count', serviceAuditController.count);
router.delete('/:id/draftDelete', serviceManagerController.draftDelete);
router.delete('/:id/purge/all', serviceManagerController.purge);
router.put('/validateUserDeletion/:app/:userId', serviceManagerController.validateUserDeletion);
router.put('/userDeletion/:app/:userId', serviceManagerController.userDeletion);
router.delete('/:id/purge/:type', serviceManagerController.purgeLogsService);
router.get('/service/:id/swagger', swaggerDocController.show);
router.put('/service/:id/statusChange', serviceManagerController.changeStatus);
router.put('/service/:id/statusChangeFromMaintenance', serviceManagerController.StatusChangeFromMaintenance);
router.get('/service/:id/checkUnique', serviceManagerController.checkUnique);
router.delete('/app/:app', serviceManagerController.deleteApp);
router.put('/:app/service/stop', serviceManagerController.stopAllServices);
router.put('/:app/service/start', serviceManagerController.startAllServices);
router.put('/:app/service/repair', serviceManagerController.repairAllServices);
router.get('/globalSchema', globalSchemaController.index);
router.post('/globalSchema', globalSchemaController.create);
router.get('/globalSchema/:id', globalSchemaController.show);
router.put('/globalSchema/:id', globalSchemaController.update);
router.delete('/globalSchema/:id', globalSchemaController.destroy);
router.get('/globalSchema/count', globalSchemaController.count);
router.get('/globalSchema/audit', globalSchemaAuditController.index);
router.get('/globalSchema/audit/count', globalSchemaAuditController.count);
router.put('/:id/start', serviceManagerController.startService);
router.put('/:id/stop', serviceManagerController.stopService);
router.put('/:id/deploy', serviceManagerController.deployService);
router.put('/:id/repair', serviceManagerController.repairService);
router.get('/:id/count', serviceManagerController.documentCount);
router.get('/:id/:app/idCount', serviceManagerController.getCounter);
router.put('/calendar/enable', serviceManagerController.enableCalendar);
router.put('/calendar/disable', serviceManagerController.disableCalendar);
router.get('/logs', logsController.index);
router.get('/:id/lockDocument/count', serviceManagerController.lockDocumentCount);
router.get('/tags', tagsController.tags);
router.get('/health/live', serviceManagerController.health);
router.get('/health/ready', serviceManagerController.readiness);
module.exports = router;
