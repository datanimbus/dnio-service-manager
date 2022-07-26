
'use strict';
//controllers
const serviceManagerController = require('./serviceManager.controller.js');
const globalSchemaController = require('./globalSchema.controller.js');
const logsController = require('./logs.controller.js');
const tagsController = require('./tags.controller.js');
const swaggerDocController = require('./swaggerDoc.controller.js');
const serviceAuditController = require('./service.audit.controller.js');
const globalSchemaAuditController = require('./globalSchema.audit.controller.js');
const bulkCreateController = require('./bulk-create.controller');
// const internalController = require('./internal.controller.js');

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

// exports.startService = serviceManagerController.startService;
// exports.stopService = serviceManagerController.stopService;
// exports.deployService = serviceManagerController.deployService;
// exports.repairService = serviceManagerController.repairService;

// exports.deleteApp = internalController.deleteApp;
// exports.swaggerDocShow = swaggerDocController.show;

// exports.tags = tagsController.tags;

// exports.enableCalendar = serviceManagerController.enableCalendar;
// exports.disableCalendar = serviceManagerController.disableCalendar;
// exports.checkUnique = serviceManagerController.checkUnique;
// exports.countByStatus = serviceManagerController.countByStatus;

// exports.serviceManagerShowByName = serviceManagerController.showByName;
// module.exports = exports;


const router = require('express').Router();
router.get('/service/fetchAll', serviceManagerController.index);
router.get('/:app/service', serviceManagerController.index);
router.post('/:app/service', serviceManagerController.create);
router.get('/:app/service/:id', serviceManagerController.show);
router.put('/:app/service/:id', serviceManagerController.update);
router.delete('/:app/service/:id', serviceManagerController.destroy);
router.get('/:app/service/utils/import/list', bulkCreateController.notificationIndex);
router.get('/:app/service/utils/import/count', bulkCreateController.notificationCount);
router.post('/:app/service/utils/import/upload', serviceManagerController.importFromXLSX);
router.get('/:app/service/utils/import/:id/show', bulkCreateController.notificationShow);
router.put('/:app/service/utils/import/:id/start', bulkCreateController.startImport);
router.delete('/:app/service/utils/import/:id/clean', bulkCreateController.cleanImport);
router.get('/:app/service/utils/verifyHook', serviceManagerController.verifyHook);
router.get('/:app/service/utils/count', serviceManagerController.count);
router.get('/:app/service/utils/status/count', serviceManagerController.countByStatus);
router.get('/:app/service/utils/audit', serviceAuditController.index);
router.get('/:app/service/utils/audit/count', serviceAuditController.count);
router.delete('/:app/service/utils/:id/draftDelete', serviceManagerController.draftDelete);
router.delete('/:app/service/utils/:id/purge/all', serviceManagerController.purge);
router.delete('/:app/service/utils/:id/purge/:type', serviceManagerController.purgeLogsService);
router.get('/:app/service/utils/:id/swagger', swaggerDocController.show);
router.get('/:app/service/utils/:id/lockDocument/count', serviceManagerController.lockDocumentCount);
router.put('/:app/service/utils/:id/statusChange', serviceManagerController.changeStatus);
router.put('/:app/service/utils/:id/statusChangeFromMaintenance', serviceManagerController.StatusChangeFromMaintenance);
router.get('/:app/service/utils/:id/checkUnique', serviceManagerController.checkUnique);
router.put('/:app/service/utils/:id/start', serviceManagerController.startService);
router.put('/:app/service/utils/:id/stop', serviceManagerController.stopService);
router.put('/:app/service/utils/:id/deploy', serviceManagerController.deployService);
router.put('/:app/service/utils/:id/repair', serviceManagerController.repairService);
router.get('/:app/service/utils/:id/count', serviceManagerController.documentCount);
router.get('/:app/service/utils/:id/idCount', serviceManagerController.getCounter);
router.get('/:app/service/utils/:id/yamls', serviceManagerController.getYamls);
router.put('/:app/service/utils/stopAll', serviceManagerController.stopAllServices);
router.put('/:app/service/utils/startAll', serviceManagerController.startAllServices);
router.put('/:app/service/utils/repairAll', serviceManagerController.repairAllServices);
router.get('/:app/service/utils/:name', serviceManagerController.showByName);
router.get('/:app/globalSchema', globalSchemaController.index);
router.post('/:app/globalSchema', globalSchemaController.create);
router.get('/:app/globalSchema/:id', globalSchemaController.show);
router.put('/:app/globalSchema/:id', globalSchemaController.update);
router.delete('/:app/globalSchema/:id', globalSchemaController.destroy);
router.get('/:app/globalSchema/utils/count', globalSchemaController.count);
router.get('/:app/globalSchema/utils/audit', globalSchemaAuditController.index);
router.get('/:app/globalSchema/utils/audit/count', globalSchemaAuditController.count);
router.put('/:app/calendar/enable', serviceManagerController.enableCalendar);
router.put('/:app/calendar/disable', serviceManagerController.disableCalendar);
router.get('/:app/logs', logsController.index);
router.get('/:app/tags', tagsController.tags);
router.delete('/:app/internal/app', serviceManagerController.deleteApp);
router.put('/:app/internal/validateUserDeletion/:userId', serviceManagerController.validateUserDeletion);
router.put('/:app/internal/userDeletion/:userId', serviceManagerController.userDeletion);
router.get('/internal/health/live', serviceManagerController.health);
router.get('/internal/health/ready', serviceManagerController.readiness);
module.exports = router;
