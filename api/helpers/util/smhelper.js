const _ = require('lodash');
const bluebird = require('bluebird');
global.Promise = bluebird;
var log4js = require('log4js');
var logger = log4js.getLogger();
let envConfig = require('../../../config/config');
const { request } = require('../../../util/got-request-wrapper');
logger.level = 'info';

function schemaValidate(schema) {
	schema.forEach(attribute => {
		if (attribute.key == '_self') {
			if (attribute['type'] === 'Object' || attribute['type'] === 'Array') {
				schemaValidate(attribute['definition']);
			}
			return;
		}
		if (attribute.key.length <= 40) {
			if ((attribute['type'] === 'Object' || attribute['type'] === 'Array') && !attribute['properties']['schemaFree']) {
				schemaValidate(attribute['definition']);
			}
		} else {
			throw new Error('Attribute name should not be more than 40 characters.');
		}
		if (attribute['properties']) {
			if (!attribute['properties']['name'] || attribute['properties']['name'].length > 40) {
				throw new Error('Name is invalid.');
			}
			if (attribute['properties']['enum'] && attribute['type'] == 'Number') {
				let listVal = attribute['properties']['enum'].length;
				let uniqueListVal = _.uniq(attribute['properties']['enum']).length;
				if (listVal != uniqueListVal) {
					throw new Error('List value is duplicate.');
				}
			}
		}
	});
}

function schemaValidateDefault(schema, app) {
	var promises = schema.map(function (attribute) {
		if ((attribute['type'] == 'Object' || attribute['type'] == 'Array') && !attribute['properties']['schemaFree']) {
			if (!(attribute['properties']['relatedTo']))
				return schemaValidateDefault(attribute['definition'], app);
		}
		if (attribute['properties'] && attribute['properties']['unique'] && attribute['properties'] && attribute['properties']['default']) {
			throw new Error('Field cannot be both default and unique for ' + attribute.key);
		}
		if (attribute['properties'] && attribute['properties']['default']) {
			let ty = attribute.type;
			if (ty == 'Object' && attribute['properties']['relatedTo'] && attribute['properties']['relatedSearchField']) {
				if (attribute['properties']['default']) {
					var defValue = attribute['properties']['default'];
					var nameID = attribute['properties']['relatedTo'];
					var obj1 = {};
					obj1['_id'] = nameID;
					return global.authorDBConnection.db.collection('services').findOne(obj1)
						.then(data => {
							var colname = data.collectionName;
							var obj = {};
							obj['_id'] = defValue;
							let dbName = envConfig.isK8sEnv() ? `${envConfig.dataStackNS}-${data.app}` : data.app;
							return global.appcenterDBConnection.db(dbName).collection(colname).findOne(obj)
								.then(_d => {
									if (!_d) {
										throw new Error('Default value is invalid for ' + attribute.key);
									}
								});
						});
				}
			}
			if (attribute['properties']['enum']) {
				if (!((attribute['properties']['enum']).indexOf(attribute['properties']['default']) > -1)) {
					throw new Error('default value not found in list of values for ' + attribute.key);
				}
			}
			if (ty == 'String') {
				if (attribute['properties']['email']) {
					let mailid = (attribute['properties']['default']);
					if (!(mailid.match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i))) {
						throw new Error('Default value is not a valid email id for ' + attribute.key);
					}
				}
				else if (attribute['properties']['pattern']) {
					let defaulPatt = (attribute['properties']['default']);
					var patt = new RegExp(attribute['properties']['pattern']);
					if (!(patt.test(defaulPatt))) {
						throw new Error('default value is not a valid pattern for ' + attribute.key);
					}
				}
				else if ((typeof attribute['properties']['default']) != 'string') {
					throw new Error('Default value type mismatch for ' + attribute.key);
				}
			}
			if (ty == 'Number') {
				if ((typeof attribute['properties']['default']) != 'number') {
					throw new Error('Default value type mismatch for ' + attribute.key);
				}
			}
			if (ty == 'Boolean') {
				if ((typeof attribute['properties']['default']) != 'boolean') {
					throw new Error('Default value type mismatch for ' + attribute.key);
				}
			}
			return Promise.resolve();
		}//add code to check default value for type location

	});
	return Promise.all(promises);
}

function getFlows(id, _req) {
	var options = {
		url: envConfig.baseUrlBM + '/flow',
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'TxnId': _req.get('txnId'),
			'Authorization': _req.get('Authorization'),
			'User': _req.get('user')
		},
		qs: {
			filter: { dataService: id },
			select: '_id,name'
		},
		json: true
	};
	return new Promise((resolve, reject) => {
		request(options, function (err, res, body) {
			if (err) {
				logger.error(err.message);
				return reject(err);
			}
			else if (!res) {
				logger.error('PM Service DOWN');
				return reject(new Error('PM Service DOWN'));
			} else {
				if (res.statusCode >= 200 && res.statusCode < 400) {
					resolve(body);
				} else {
					reject(new Error(body.message ? body.message : 'API returned ' + res.statusCode));
				}
			}
		});
	});

}

function checkData(uri) {
	let uriSplit = uri.split('/');
	let db = `${envConfig.dataStackNS}-${uriSplit[1]}`;
	let lastSeg = uriSplit[2];
	let lastSegSplit = lastSeg.split('?');
	let collection = `${lastSegSplit[0]}`;
	let filter = lastSegSplit[1].replace('filter=', '').replace('"{{id}}"', '{"$exists": true}');
	return global.appcenterDBConnection.db(db).collection(collection).findOne(JSON.parse(filter));
}

function canUpdateAPI(relations) {
	let promises = relations.map(_s => {
		return checkData(_s.uri);
	});
	return Promise.all(promises)
		.then(_d => {
			let flag = _d.some(_e => _e);
			if (flag) throw new Error('Cannot update api endpoint as it is related to other data service');
		});
}

function generateHeadersForProperties(_txnId, _headers) {
	logger.trace(`[${_txnId}] Generating headers for properties :: Before :: ${JSON.stringify(_headers)}`);
	_headers.forEach(_header => {
		_header['header'] = `Data-Stack-DS-${_header.key}`;
	});
	logger.trace(`[${_txnId}] Generating headers for properties :: After :: ${JSON.stringify(_headers)}`);
	return _headers;
}

module.exports.schemaValidate = schemaValidate;
module.exports.schemaValidateDefault = schemaValidateDefault;
module.exports.getFlows = getFlows;
module.exports.canUpdateAPI = canUpdateAPI;
module.exports.generateHeadersForProperties = generateHeadersForProperties;