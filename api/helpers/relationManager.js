const mongoose = require(`mongoose`);
const _ = require(`lodash`);
const logger = global.logger;
var e = {};

function generateFilter(schema, key) {
	if (typeof schema === `object` && Object.keys(schema)[0] === `_self`) {
		if (typeof schema[Object.keys(schema)[0]] === `object`) {
			return embedObject(schema[`_self`], `$elemMatch`);
		} else {
			return `"${key}":{"$elemMatch":{"_id":"{{id}}"}}`;
		}
	} else if (typeof schema === `object`) {
		let newKey = key == `` ? `${Object.keys(schema)[0]}` : `${key}.${Object.keys(schema)[0]}`;
		if (typeof schema[Object.keys(schema)[0]] === `object`) {
			let nextKey = Object.keys(schema[Object.keys(schema)[0]])[0];
			if (nextKey === `_self` && typeof schema[Object.keys(schema)[0]][nextKey] === `object`) {
				return embedObject(schema[Object.keys(schema)[0]], newKey);
			} else {
				return generateFilter(schema[Object.keys(schema)[0]], newKey);
			}
		} else {
			return `"${newKey}._id":"{{id}}"`;
		}
	} else {
		return `"{{id}}"`;
	}
}

function embedObject(schema, key) {
	return typeof schema === `object` ? `"${key}":{${generateFilter(schema, ``)}}` : `"${key}._id":{${generateFilter(schema, ``)}}`;
}

function getSchemaRelations(schema) {
	let relations = [];
	Object.keys(schema).forEach(key => {
		if (schema[key][`properties`] && schema[key][`properties`][`relatedTo`]) {
			let pathObj = {};
			pathObj[key] = schema[key][`type`];
			let service = schema[key][`properties`][`relatedTo`];
			let isRequired = schema[key][`properties`][`required`] ? true : false;
			if (!isRequired) isRequired = schema[key][`properties`][`deleteAction`] == `restrict`;
			relations.push({
				path: JSON.parse(JSON.stringify(pathObj)),
				service,
				isRequired
			});
		} else if (schema[key][`definition`]) {
			let nestedRel = getSchemaRelations(schema[key][`definition`]);
			nestedRel.forEach(obj => {
				let rel = {};
				rel[`service`] = obj.service;
				rel[`path`] = {};
				rel[`path`][key] = JSON.parse(JSON.stringify(obj.path));
				rel[`isRequired`] = obj.isRequired;
				relations.push(rel);
			});
		}
	});
	return relations;
}

function getUsers(schema) {
	let relations = [];
	Object.keys(schema).forEach(key => {
		if (schema[key] && schema[key][`type`] == `User`) {
			let pathObj = {};
			pathObj[key] = schema[key][`type`];
			let isRequired = schema[key][`properties`][`required`] ? true : false;
			if (!isRequired) isRequired = schema[key][`properties`][`deleteAction`] == `restrict`;
			relations.push({
				path: JSON.parse(JSON.stringify(pathObj)),
				isRequired
			});
		}
		else if (schema[key][`definition`]) {
			let nestedRel = getUsers(schema[key][`definition`]);
			nestedRel.forEach(obj => {
				let rel = {};
				rel[`path`] = {};
				rel[`path`][key] = JSON.parse(JSON.stringify(obj.path));
				rel[`isRequired`] = obj.isRequired;
				relations.push(rel);
			});
		}
	});
	return relations;
}

function getPathfromServiceId(serviceID, serviceArr) {
	return serviceArr.filter(obj => obj.service === serviceID);
}

e.checkRelationsAndCreate = function (_serviceInfo, req) {
	let outgoingServiceArr = null;
	var servicePromiseArr = [];
	let genServiceObj = null;
	let serviceInfo = JSON.parse(JSON.stringify(_serviceInfo));
	let schema = JSON.parse(serviceInfo.definition);
	let relations = getSchemaRelations(schema);
	let userRelation = getUsers(schema);
	let outgoingServicesList = relations.map(obj => obj.service);
	outgoingServicesList = _.uniq(outgoingServicesList);
	let outgoingServicesObj = relations.map(obj => {
		let newObj = JSON.parse(JSON.stringify(obj));
		newObj.path = JSON.stringify(newObj.path);
		return newObj;
	});

	let userObj = userRelation.map(obj => {
		let newObj = JSON.parse(JSON.stringify(obj));
		let filter = `{ ${generateFilter(newObj.path, ``)}}`;
		newObj.filter = filter;
		newObj.path = JSON.stringify(newObj.path);
		return newObj;
	});

	if (!serviceInfo.relatedSchemas) serviceInfo.relatedSchemas = {};
	serviceInfo.relatedSchemas.outgoing = outgoingServicesObj;

	if (!serviceInfo.relatedSchemas.internal) serviceInfo.relatedSchemas.internal = {};
	serviceInfo.relatedSchemas.internal.users = userObj;

	// return relationCyclicCheck.checkCyclic("newService", JSON.parse(JSON.stringify(serviceInfo.relatedSchemas)))
	//     .then(isCyclic => {
	//         if (isCyclic) throw new Error("Generated service will lead to cyclic relationship");
	//     })
	//     .then(() => {
	return mongoose.model(`services`).find({
		_id: {
			$in: outgoingServicesList
		}
	})
		.then((docs) => {
			if (docs.length === outgoingServicesList.length) {
				outgoingServiceArr = docs;
				let model = mongoose.model(`services`);
				let doc = new model(serviceInfo);
				return doc.save(req);
			} else {
				let docsIdList = docs.map(obj => obj._id);
				let unMatchedId = _.difference(outgoingServicesList, docsIdList);
				throw new Error(`The following ServiceID not found ` + unMatchedId);
			}
		})
		.then((_genServiceObj) => {
			genServiceObj = JSON.parse(JSON.stringify(_genServiceObj));
			outgoingServiceArr.forEach(doc => {
				let pathArr = getPathfromServiceId(doc._id, relations);
				pathArr.forEach(obj => {
					let basePath = genServiceObj.api.charAt(0) === `/` ? genServiceObj.api : `/` + genServiceObj.api;
					let uri = `/` + genServiceObj.app + basePath + `?filter={` + generateFilter(obj.path, ``) + `}`;
					if (!doc.relatedSchemas.incoming) doc.relatedSchemas.incoming = [];
					doc.relatedSchemas.incoming.push({
						service: genServiceObj._id,
						uri: uri,
						port: genServiceObj.port,
						app: genServiceObj.app,
						isRequired: obj.isRequired
					});
				});
				doc.markModified(`relatedSchemas.incoming`);
				servicePromiseArr.push(doc.save(req));
			});
			return Promise.all(servicePromiseArr);
		})
		.then(() => {
			return genServiceObj;
		});
};

e.getOutgoingRelationAndUpdate = function (newData, req) {
	if (!newData.definition) return newData.save(req);
	let newSchema = JSON.parse(newData.definition);
	let newRelations = getSchemaRelations(newSchema);
	let newUsers = getUsers(newSchema);
	let newOutgoingServicesList = _.uniq(newRelations.map(obj => obj.service));
	if (!newData.relatedSchemas) newData.relatedSchemas = {};
	if (!newData.relatedSchemas.internal) newData.relatedSchemas.internal = {};
	let outgoingServicesObj = newRelations.map(obj => {
		let newObj = JSON.parse(JSON.stringify(obj));
		newObj.path = JSON.stringify(newObj.path);
		return newObj;
	});
	let userObj = newUsers.map(obj => {
		let newObj = JSON.parse(JSON.stringify(obj));
		let filter = `{ ${generateFilter(newObj.path, ``)}}`;
		newObj.filter = filter;
		newObj.path = JSON.stringify(newObj.path);
		return newObj;
	});
	newData.relatedSchemas.outgoing = outgoingServicesObj;
	newData.relatedSchemas.internal.users = userObj;
	return mongoose.model(`services`).find({ _id: { $in: newOutgoingServicesList } })
		.then((docs) => {
			logger.debug(`docs.length`, docs.length);
			logger.debug(`newOutgoingServicesList.length`, newOutgoingServicesList.length);
			if (docs.length === newOutgoingServicesList.length) {
				newData.markModified(`relatedSchemas.outgoing`); //to save the latest changes of relatedSchemas.outgoing
				return newData.save(req);
			} else {
				let docsIdList = docs.map(obj => obj._id);
				let unMatchedId = _.difference(newOutgoingServicesList, docsIdList);
				throw new Error(`The following Service ID not found ` + unMatchedId);
			}
		});
};

e.checkRelationsAndUpdate = function (oldData, newData, req) {
	let genServiceObj = null;
	let newSchema = JSON.parse(newData.definition);
	let oldSchema = JSON.parse(oldData.definition);
	let newRelations = getSchemaRelations(newSchema);
	let oldRelations = getSchemaRelations(oldSchema);
	let newUsersRelation = getUsers(newSchema);
	let newOutgoingServicesList = _.uniq(newRelations.map(obj => obj.service));
	let oldOutgoingServicesList = _.uniq(oldRelations.map(obj => obj.service));
	let outgoingServicesObj = newRelations.map(obj => {
		let newObj = JSON.parse(JSON.stringify(obj));
		newObj.path = JSON.stringify(newObj.path);
		return newObj;
	});
	
	let userObj = newUsersRelation.map(obj => {
		let newObj = JSON.parse(JSON.stringify(obj));
		let filter = `{ ${generateFilter(newObj.path, ``)}}`;
		newObj.filter = filter;
		newObj.path = JSON.stringify(newObj.path);
		return newObj;
	});

	if (!newData.relatedSchemas) newData.relatedSchemas = {};
	newData.relatedSchemas.outgoing = outgoingServicesObj;

	if (!newData.relatedSchemas.internal) newData.relatedSchemas.internal = {};
	newData.relatedSchemas.internal.users = userObj;
	return mongoose.model(`services`).find({ _id: { $in: newOutgoingServicesList } })
		.then((docs) => {
			logger.debug(`docs.length`, docs.length);
			logger.debug(`newOutgoingServicesList.length`, newOutgoingServicesList.length);
			if (docs.length === newOutgoingServicesList.length) {
				delete newData.__v;
				newData.markModified(`relatedSchemas.outgoing`); //to save the latest changes of relatedSchemas.outgoing
				return newData.save(req);
			} else {
				let docsIdList = docs.map(obj => obj._id);
				let unMatchedId = _.difference(newOutgoingServicesList, docsIdList);
				throw new Error(`The following Service ID not found ` + unMatchedId);
			}
		})
		.then((_genServiceObj) => {
			genServiceObj = JSON.parse(JSON.stringify(_genServiceObj));
			if (oldOutgoingServicesList.length == 0) return Promise.resolve([]);
			return mongoose.model(`services`).find({
				_id: {
					$in: oldOutgoingServicesList
				}
			});
		})
		.then(docs => {
			let promiseArr = docs.map(doc => {
				if (doc.relatedSchemas.incoming) {
					doc.relatedSchemas.incoming = doc.relatedSchemas.incoming.filter(obj => obj.service != newData._id);
					doc.markModified(`relatedSchemas.incoming`);
					return doc.save(req);
				}
			});
			return Promise.all(promiseArr);
		})
		.then(() => {
			if (newOutgoingServicesList.length == 0) return Promise.resolve([]);
			return mongoose.model(`services`).find({
				_id: {
					$in: newOutgoingServicesList
				}
			});
		})
		.then(docs => {
			let promiseArr = docs.map(doc => {
				if (!doc.relatedSchemas.incoming) doc.relatedSchemas.incoming = [];
				let pathArr = getPathfromServiceId(doc._id, newRelations);
				pathArr.forEach(obj => {
					let uri = `/` + genServiceObj.app + genServiceObj.api + `?filter={` + generateFilter(obj.path, ``) + `}`;
					doc.relatedSchemas.incoming.push({
						service: genServiceObj._id,
						uri: uri,
						port: genServiceObj.port,
						isRequired: obj.isRequired
					});
				});
				doc.markModified(`relatedSchemas.incoming`);
				return doc.save(req);
			});
			return Promise.all(promiseArr);
		})
		.then(() => {
			return genServiceObj;
		});
};
module.exports = e;