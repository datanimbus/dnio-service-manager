const _ = require(`lodash`);
const bluebird = require(`bluebird`);
global.Promise = bluebird;
var log4js = require(`log4js`);
var logger = log4js.getLogger();
let envConfig = require(`../../../config/config`);
const request = require(`request`);
logger.level = `info`;

function schemaValidate(schemaObj) {
	if (schemaObj[`_self`]) {
		if (schemaObj[`_self`][`type`] === `Object`) {
			schemaValidate(schemaObj[`_self`][`definition`]);
		} else if (schemaObj[`_self`][`type`] === `Array`) {
			schemaValidate(schemaObj[`_self`][`definition`]);
		}
	} else {
		Object.keys(schemaObj).forEach(key => {
			if (key.length <= 40) {
				if (schemaObj[key][`type`] === `Object` || schemaObj[key][`type`] === `Array`) {
					schemaValidate(schemaObj[key][`definition`]);
				}
			} else {
				throw new Error(`Attribute name should not be more than 40 characters.`);
			}
			if (schemaObj[key][`properties`]) {
				if (!schemaObj[key][`properties`][`name`] || schemaObj[key][`properties`][`name`].length > 40) {
					throw new Error(`Name is invalid.`);
				}
				if (schemaObj[key][`properties`][`enum`] && schemaObj[key][`type`] == `Number`) {
					let listVal = schemaObj[key][`properties`][`enum`].length;
					let uniqueListVal = _.uniq(schemaObj[key][`properties`][`enum`]).length;
					if (listVal != uniqueListVal) {
						throw new Error(`List value is duplicate.`);
					}
				}
			}
		});
	}
}

function schemaValidateDefault(schemaObj, app) {
	var promises = Object.keys(schemaObj).map(function (key) {
		if (schemaObj[key][`type`] == `Object` || schemaObj[key][`type`] == `Array`) {
			if (!(schemaObj[key][`properties`][`relatedTo`]))
				return schemaValidateDefault(schemaObj[key][`definition`], app);
		}
		if (schemaObj[key][`properties`] && schemaObj[key][`properties`][`unique`] && schemaObj[key][`properties`] && schemaObj[key][`properties`][`default`]) {
			throw new Error(`Field cannot be both default and unique for ` + key);
		}
		if (schemaObj[key][`properties`] && schemaObj[key][`properties`][`default`]) {
			let ty = schemaObj[key].type;
			if (ty == `Object` && schemaObj[key][`properties`][`relatedTo`] && schemaObj[key][`properties`][`relatedSearchField`]) {
				if (schemaObj[key][`properties`][`default`]) {
					var defValue = schemaObj[key][`properties`][`default`];
					var nameID = schemaObj[key][`properties`][`relatedTo`];
					var obj1 = {};
					obj1[`_id`] = nameID;
					return global.mongoDB.db.collection(`services`).findOne(obj1)
						.then(data => {
							var colname = data.collectionName;
							var obj = {};
							obj[`_id`] = defValue;
							let dbName = envConfig.isK8sEnv() ? `${envConfig.odpNS}-${data.app}` : data.app;
							return global.mongoConnection.db(dbName).collection(colname).findOne(obj)
								.then(_d => {
									if (!_d) {
										throw new Error(`Default value is invalid for ` + key);
									}
								});
						});
				}
			}
			if (schemaObj[key][`properties`][`enum`]) {
				if (!((schemaObj[key][`properties`][`enum`]).indexOf(schemaObj[key][`properties`][`default`]) > -1)) {
					throw new Error(`default value not found in list of values for ` + key);
				}
			}
			if (ty == `String`) {
				if (schemaObj[key][`properties`][`email`]) {
					let mailid = (schemaObj[key][`properties`][`default`]);
					if (!(mailid.match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i))) {
						throw new Error(`Default value is not a valid email id for ` + key);
					}
				}
				else if (schemaObj[key][`properties`][`pattern`]) {
					let defaulPatt = (schemaObj[key][`properties`][`default`]);
					var patt = new RegExp(schemaObj[key][`properties`][`pattern`]);
					if (!(patt.test(defaulPatt))) {
						throw new Error(`default value is not a valid pattern for ` + key);
					}
				}
				else if ((typeof schemaObj[key][`properties`][`default`]) != `string`) {
					throw new Error(`Default value type mismatch for ` + key);
				}
			}
			if (ty == `Number`) {
				if ((typeof schemaObj[key][`properties`][`default`]) != `number`) {
					throw new Error(`Default value type mismatch for ` + key);
				}
			}
			if (ty == `Boolean`) {
				if ((typeof schemaObj[key][`properties`][`default`]) != `boolean`) {
					throw new Error(`Default value type mismatch for ` + key);
				}
			}
			return Promise.resolve();
		}//add code to check default value for type location

	});
	return Promise.all(promises);
}

function getFlows(id, _req) {
	var options = {
		url: envConfig.baseUrlPM + `/flow`,
		method: `GET`,
		headers: {
			'Content-Type': `application/json`,
			'TxnId': _req.get(`txnId`),
			'Authorization': _req.get(`Authorization`),
			'User': _req.get(`user`)
		},
		qs: {
			filter: { dataService: id },
			select: `_id,name`
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
				logger.error(`PM Service DOWN`);
				return reject(new Error(`PM Service DOWN`));
			} else {
				if (res.statusCode >= 200 && res.statusCode < 400) {
					resolve(body);
				} else {
					reject(new Error(body.message ? body.message : `API returned ` + res.statusCode));
				}
			}
		});
	});

}

function checkData(uri) {
	let uriSplit = uri.split(`/`);
	let db = `${envConfig.odpNS}-${uriSplit[1]}`;
	let lastSeg = uriSplit[2];
	let lastSegSplit = lastSeg.split(`?`);
	let collection = `${lastSegSplit[0]}`;
	let filter = lastSegSplit[1].replace(`filter=`, ``).replace(`"{{id}}"`, `{"$exists": true}`);
	return global.mongoConnection.db(db).collection(collection).findOne(JSON.parse(filter));
}

function canUpdateAPI(relations) {
	let promises = relations.map(_s => {
		return checkData(_s.uri);
	});
	return Promise.all(promises)
		.then(_d => {
			let flag = _d.some(_e => _e);
			if (flag) throw new Error(`Cannot update api endpoint as it is related to other data service`);
		});
}

module.exports.schemaValidate = schemaValidate;
module.exports.schemaValidateDefault = schemaValidateDefault;
module.exports.getFlows = getFlows;
module.exports.canUpdateAPI = canUpdateAPI;