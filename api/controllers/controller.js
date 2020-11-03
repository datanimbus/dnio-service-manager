'use strict';
//controllers
const serviceManagerController = require('./serviceManager.controller.js');
const globalSchemaController = require('./globalSchema.controller.js');
const logsController = require('./logs.controller.js');
const tagsController = require('./tags.controller.js');
const swaggerDocController = require('./swaggerDoc.controller.js');
const serviceAuditController = require('./service.audit.controller.js');
const globalSchemaAuditController = require('./globalSchema.audit.controller.js');

//exports
var exports = {};
exports.serviceManagerVerifyHook = serviceManagerController.verifyHook;
exports.serviceManagerCreate = serviceManagerController.create;
exports.serviceManagerList = serviceManagerController.index;
exports.serviceManagerShow = serviceManagerController.show;
exports.serviceManagerDestroy = serviceManagerController.destroy;
exports.serviceManagerUpdate = serviceManagerController.update;
exports.serviceManagerDraftDelete = serviceManagerController.draftDelete;
exports.getServiceCount = serviceManagerController.count;
exports.vishnuDocumentCount = serviceManagerController.documentCount;
exports.vishnuIdCounter = serviceManagerController.getCounter;
exports.purgeService = serviceManagerController.purge;
exports.purgeLogsService = serviceManagerController.purgeLogsService;
exports.stopAllServices = serviceManagerController.stopAllServices;
exports.startAllServices = serviceManagerController.startAllServices;
exports.serviceAudit = serviceAuditController.index;
exports.health = serviceManagerController.health;
exports.readiness = serviceManagerController.readiness;
exports.serviceAuditCount = serviceAuditController.count;
exports.serviceManagerStatusChange = serviceManagerController.changeStatus;
exports.serviceManagerStatusChangeFromMaintenance = serviceManagerController.StatusChangeFromMaintenance;
exports.globalSchemaCreate = globalSchemaController.create;
exports.globalSchemaList = globalSchemaController.index;
exports.globalSchemaShow = globalSchemaController.show;
exports.globalSchemaDestroy = globalSchemaController.destroy;
exports.globalSchemaUpdate = globalSchemaController.update;
exports.globalSchemaCount = globalSchemaController.count;
exports.globalSchemaAudit = globalSchemaAuditController.index;
exports.globalSchemaAuditCount = globalSchemaAuditController.count;
exports.validateUserDeletion = serviceManagerController.validateUserDeletion;
exports.userDeletion = serviceManagerController.userDeletion;

exports.startService = serviceManagerController.startService;
exports.stopService = serviceManagerController.stopService;
exports.deployService = serviceManagerController.deployService;
exports.repairService = serviceManagerController.repairService;
exports.deleteApp = serviceManagerController.deleteApp;

exports.logsControllerList = logsController.index;
exports.logsControllerCount = logsController.count;
exports.lockDocumentCount = serviceManagerController.lockDocumentCount;

exports.swaggerDocShow = swaggerDocController.show;

exports.tags = tagsController.tags;

exports.enableCalendar = serviceManagerController.enableCalendar;
exports.disableCalendar = serviceManagerController.disableCalendar;
exports.checkUnique = serviceManagerController.checkUnique;
exports.countByStatus = serviceManagerController.countByStatus;
module.exports = exports;
    