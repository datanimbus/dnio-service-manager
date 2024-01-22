'use strict';

const mongoose = require('mongoose');
const request = require('../../util/got-request-wrapper');

const deployUtil = require('../deploy/deploymentUtil');
const k8s = require('../../util/k8s.js');
const envConfig = require('../../config/config');

const logger = global.logger;

var e = {};


function dropCollections(collectionName, app, txnId) {
	logger.debug(`[${txnId}] DropCollection :: DB clean up : ${app}`);
	// let appCenterDB = global.mongoConnection.db(app);
	let appCenterDB = global.dbAppcenterConnection.useDb(app);
	logger.error(`[${txnId}] DropCollection :: AppCenter DB Connection ${appCenterDB ? 'Active' : 'Inactive'}`);
	if (appCenterDB) {
		logger.debug(`[${txnId}] DropCollection :: DB clean up drop collection : ${collectionName}`);
		appCenterDB.dropCollection(collectionName, (err, coll) => {
			if (err) logger.error(`[${txnId}] DropCollection :: ${collectionName} :: ${err.message}`);
			else if (coll) logger.info(`[${txnId}] DropCollection :: Collection ${collectionName} deleted successfully`);
		});
		let sufix = ['.bulkCreate', '.exportedFile.chunks', '.exportedFile.files', '.fileImport.chunks', '.fileImport.files', '.fileTransfers', '.files', '.chunks', '.workflow'];
		sufix.forEach(_s => {
			let colName = collectionName + _s;
			logger.debug(`[${txnId}] DropCollection :: DB clean up drop collection : ${colName}`);
			appCenterDB.dropCollection(colName, (err, coll) => {
				if (err) logger.error(`[${txnId}] DropCollection :: ${colName} :: ${err.message}`);
				if (coll) logger.info(`[${txnId}] DropCollection :: Collection ${colName} deleted successfully`);
			});
		});
		appCenterDB.collection('counters').remove({ _id: collectionName }, function (err) {
			if (err) logger.error(`[${txnId}] DropCollection :: counter :: ${collectionName} :: ${err.message}`);
			else logger.info(`[${txnId}] DropCollection :: Counter ${collectionName} deleted successfully`);
		});
	}
}

function removeWebHooks(serviceId, _req) {
	let txnId = _req.get('TxnId');
	logger.debug(`[${txnId}] Removing web hooks :: ${serviceId}`);
	var options = {
		url: envConfig.baseUrlNE + '/webHook/' + serviceId,
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			'TxnId': txnId,
			'Authorization': _req.get('Authorization')
		},
		json: true
	};
	request.delete(options, function (err, res) {
		if (err) logger.error(`[${txnId}] Remove web hooks :: ${serviceId} :: ${err.message}`);
		else if (!res) logger.error(`[${txnId}] Remove web hooks :: ${serviceId} :: Notification Engine down!`);
		else logger.info(`[${txnId}] Remove web hooks :: ${serviceId} :: Done!`);
	});
}

function destroyDeployment(id, count, _req) {
	logger.info(`[${_req.get('TxnId')}] Destroy attempt no: ${count} :: ${id}`);
	return deployUtil.updateDocument(mongoose.model('services'), { _id: id }, { status: 'Pending' }, _req)
		.then(_d => {
			if (envConfig.isK8sEnv()) {
				return k8s.deploymentDelete(_req.get('TxnId'), _d)
					.then(() => logger.info(`[${_req.get('TxnId')}] Deployment delete request queued for ${_d._id}`))
					.then(() => k8s.serviceDelete(_req.get('TxnId'), _d))
					.then(() => logger.info(`[${_req.get('TxnId')}] Service delete request queued for ${_d._id}`))
					.catch(_e => logger.error(`[${_req.get('TxnId')}] ${_e.message}`));
			} else {
				logger.info(`[${_req.get('TxnId')}] PM2 not supported`);
				return id;
			}
		})
		.catch(err => {
			deployUtil.updateDocument(mongoose.model('services'), { _id: id }, { comment: err.message }, _req)
				.then(() => {
					// if (count >= destroyDeploymentRetry) throw err;
				})
				.then(() => destroyDeployment(id, count + 1, _req))
				.catch(e => logger.error(`[${_req.get('TxnId')}] ${e.message}`));
		});
}


e.deleteApp = async function (req, res) {
	try {
		let app = req.swagger.params.app.value;
		logger.info('Deleting App details from SM :: ', app);

		let socket = req.app.get('socket');
		let services = await mongoose.model('services').find({ 'app': app }, '_id,app,collectionName');
		let draftServices = await mongoose.model('services.draft').find({ 'app': app }, '_id');
		let globalSchemas = await mongoose.model('globalSchema').find({ 'app': app }, '_id');

		logger.trace('Services :: ', services);
		logger.trace('Draft Services :: ', draftServices);
		logger.trace('Global Schemas :: ', globalSchemas);

		let serviceIds = services.map(s => s.id);
		let gsIds = globalSchemas.map(gs => gs.id);

		res.json({
			message: 'Removing ' + serviceIds + ' services, and ' + gsIds + ' libraries.'
		});

		await Promise.all(serviceIds.map(id => destroyDeployment(id, 0, req)));

		let promises = services.map(doc => {
			deployUtil.sendToSocket(socket, 'serviceStatus', {
				_id: doc._id,
				app: doc.app,
				message: 'Undeployed'
			});
			dropCollections(doc.collectionName, `${process.env.DATA_STACK_NAMESPACE}-${doc.app}`, req.get('TxnId'));
			deployUtil.sendToSocket(socket, 'deleteService', {
				_id: doc._id,
				app: doc.app,
				message: 'Entity has been deleted'
			});
			removeWebHooks(doc._id, req);
			return doc.remove(req);
		});

		await Promise.all(promises);

		await Promise.all(draftServices.map(doc => doc.remove(req)));

		return Promise.all(globalSchemas.map(doc => {
			doc._req = req;
			doc.remove(req);
		}));

	} catch (err) {
		logger.trace(err);
		if (!res.headersSent) {
			res.status(500).json({
				message: err.message
			});
		}
	}
};

module.exports = e;
