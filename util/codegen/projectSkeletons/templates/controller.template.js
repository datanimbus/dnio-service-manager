module.exports = function(_id, id){
	var controller = `"use strict";
//controllers
const ${id}Controller = require("./${_id}.controller.js");
// const logsController = require("./logs.controller.js");
const preHooksController = require("./preHooks.controller.js");
// const webHookStatusController = require("./webHookStatus.controller.js");
const bulkUploadController = require("./bulkUpload.controller.js");

//exports
var exports = {};
exports.v1_${_id}Create = ${id}Controller.create;
exports.v1_${_id}List = ${id}Controller.index;
exports.v1_${_id}Export = ${id}Controller.exportAll;
exports.v1_${_id}ExportDetailsCount = ${id}Controller.exportDetailsCount;
exports.v1_${_id}ExportDetailsDelete = ${id}Controller.exportDetailsDelete;
exports.v1_${_id}ExportDetails = ${id}Controller.exportDetails;
exports.v1_${_id}Show = ${id}Controller.show;
exports.v1_${_id}Destroy = ${id}Controller.destroy;
exports.v1_${_id}Update = ${id}Controller.update;
exports.v1_${_id}Math = ${id}Controller.math;
exports.v1_${_id}Count = ${id}Controller.count;
exports.v1_${_id}Hook = preHooksController.triggerHook;
exports.v1_${_id}BulkShow = ${id}Controller.bulkShow;
exports.v1_${_id}BulkUpdate = ${id}Controller.bulkUpdate;
exports.v1_${_id}BulkDelete = ${id}Controller.bulkDelete;
exports.v1_${_id}FileUpload = ${id}Controller.fileUpload;
exports.v1_${_id}FileView = ${id}Controller.fileView;
exports.v1_${_id}FileDownload = ${id}Controller.fileDownload;
exports.v1_${_id}ExportedFileDownload = ${id}Controller.exportedFileDownload;
exports.v1_${_id}Doc = ${id}Controller.doc;
exports.v1_${_id}HealthCheck = ${id}Controller.healthCheck;
exports.v1_${_id}ReadinessCheck = ${id}Controller.readiness;
exports.v1_${_id}Simulate = ${id}Controller.simulate;
exports.v1_${_id}LockDocument = ${id}Controller.lockDocument;
exports.v1_${_id}ExperienceHook = ${id}Controller.experienceHookData;
exports.v1_${_id}SecuredFields = ${id}Controller.securedFields;
// exports.v1_logsIndex = logsController.index;
// exports.v1_logsControllerCount = logsController.count;
// exports.v1_webHookStatusIndex = webHookStatusController.index;
// exports.v1_webHookStatusCount = webHookStatusController.count;
exports.v1_mapping = bulkUploadController.validateData;
exports.v1_enrichData = bulkUploadController.enrichData;
exports.v1_enrichDataForWF = bulkUploadController.enrichDataForWF;
exports.v1_bulkCreate = bulkUploadController.bulkCreate;
exports.fileMapperCount = bulkUploadController.fileMapperCount;
exports.fileMapperList = bulkUploadController.fileMapperList;
exports.updateFileStatus = bulkUploadController.updateFileStatus;
exports.v1_aggregate = ${id}Controller.aggregate;
exports.v1_updateHref = ${id}Controller.updateHref;

module.exports = exports;
    `;
	return controller;
};
