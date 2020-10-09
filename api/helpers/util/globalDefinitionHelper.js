const mongoose = require(`mongoose`);
const systemGlobalSchema = require(`../systemGlobalSchema.js`);
const mongooseDataType = [`String`, `Number`, `Date`, `Boolean`, `Object`, `Array`];

var e = {};

function getGlobalDefinition(id, globalDefArr) {
	let obj = globalDefArr.find(obj => obj._id === id && obj.definition);
	if (!obj) return null;
	return obj.definition;
}

function getSystemGlobalDefinition(type, globalDefArr) {
	let obj = globalDefArr.find(obj => obj.name === type);
	if (!obj) return null;
	return obj.definition;
}

function getAllGlobalDefinitions(app) {
	let globalDocs = null;
	return new Promise(resolve => {
		mongoose.model(`globalSchema`).find({ 'app': app, definition: { $exists: true } }, `name definition`)
			.then(docs => {
				if (docs) {
					docs = JSON.parse(JSON.stringify(docs));
					docs = docs.map(doc => {
						if (doc.definition) doc.definition = JSON.parse(doc.definition);
						return doc;
					});
					globalDocs = docs;
				}
				resolve(globalDocs);
			});
	});
}

function substituteGlobalDefinition(schema, globalSchema) {
	Object.keys(schema).forEach(key => {
		if (key !== `properties` && key !== `_id`) {
			if (schema[key][`type`] == `Global` || (schema[key][`properties`] && schema[key][`properties`][`schema`])) {
				if (!schema[key][`properties`][`schema`]) throw new Error(`Property schema missing for type Global`);
				let globalDefinition = getGlobalDefinition(schema[key][`properties`][`schema`], globalSchema);
				let properties = schema[key][`properties`];
				if (!globalDefinition) throw new Error(`Library schema not found.`);
				schema[key] = JSON.parse(JSON.stringify(globalDefinition));
				if (properties) schema[key][`properties`] = JSON.parse(JSON.stringify(properties));
			}
			else if (schema[key][`properties`] && schema[key][`properties`][`relatedTo`]) {
				let sysDef = getSystemGlobalDefinition(`Relation`, systemGlobalSchema);
				if (sysDef) {
					let properties = schema[key][`properties`];
					schema[key] = JSON.parse(JSON.stringify(sysDef));
					if (properties) schema[key][`properties`] = JSON.parse(JSON.stringify(properties));
				}
			}
			else if (schema[key][`type`] == `User`) {
				let sysDef = getSystemGlobalDefinition(`User`, systemGlobalSchema);
				if (sysDef) {
					let properties = schema[key][`properties`];
					schema[key] = JSON.parse(JSON.stringify(sysDef));
					if (properties) schema[key][`properties`] = JSON.parse(JSON.stringify(properties));
				}
			}
			else if (schema[key][`properties`] && schema[key][`properties`][`password`]) {
				let sysDef = getSystemGlobalDefinition(`SecureText`, systemGlobalSchema);
				if (sysDef) {
					let properties = schema[key][`properties`];
					let newDef = JSON.parse(JSON.stringify(sysDef));
					if (schema[key][`properties`][`unique`]) {
						newDef.definition.checksum.properties.unique = true;
					}
					schema[key] = newDef;
					if (properties) schema[key][`properties`] = JSON.parse(JSON.stringify(properties));
				}
			}
			if (schema[key][`definition`])
				substituteGlobalDefinition(schema[key][`definition`], globalSchema);
		}
	});
}

function substituteSystemGlobalDefinition(schema) {
	Object.keys(schema).forEach(key => {
		if (key !== `properties` && key !== `_id`) {
			if (mongooseDataType.indexOf(schema[key][`type`]) == -1) {
				let sysDef = getSystemGlobalDefinition(schema[key][`type`], systemGlobalSchema);
				if (sysDef) {
					let properties = schema[key][`properties`];
					schema[key] = JSON.parse(JSON.stringify(sysDef));
					if (properties) schema[key][`properties`] = JSON.parse(JSON.stringify(properties));
				}
			}
			if (schema[key][`definition`])
				substituteSystemGlobalDefinition(schema[key][`definition`], systemGlobalSchema);
		}
	});
}

e.expandSchemaWithSystemGlobalDef = function (definition) {
	substituteSystemGlobalDefinition(definition);
	return definition;
};

e.expandSchemaWithGlobalDef = function (app, definition) {
	return new Promise((resolve, reject) => {
		getAllGlobalDefinitions(app)
			.then(globalDefinitions => {
				if (globalDefinitions) substituteGlobalDefinition(definition, globalDefinitions);
				resolve(definition);
			})
			.catch(err => {
				reject(err);
			});
	});
};

module.exports = e;