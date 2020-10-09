/**
 * This module will create a definition file from the configuration provided by the user
 */

const fileIO = require(`./fileIO.js`);
const _ = require(`lodash`);
const mongooseFields = [`required`, `default`, `index`, `select`, `lowercase`, `uppercase`, `trim`, `match`, `enum`, `min`, `max`, `minlength`, `maxlength`];
const logger = global.logger;
function filterMongooseFields(schemaObj) {
	let newObj = _.pick(schemaObj, mongooseFields, `type`);
	if (!newObj[`required`]) delete newObj.required;
	if (!newObj[`unique`]) delete newObj.unique;
	return newObj;
}

function processSchema(schemaObj, mongoSchema, nestedKey, specialFields) {
	if (schemaObj[`_self`]) {
		if (schemaObj[`_self`][`properties`] && (schemaObj[`_self`][`properties`][`password`])) {
			specialFields[`secureFields`].push(nestedKey);
		}
		if (schemaObj[`_self`][`type`] === `Object`) {
			processSchema(schemaObj[`_self`][`definition`], mongoSchema, nestedKey, specialFields);
		}
		else if (schemaObj[`_self`][`type`] === `User`) {
			processSchema(schemaObj[`_self`][`definition`], mongoSchema, nestedKey, specialFields);
		} else if (schemaObj[`_self`][`type`] === `Array`) {
			mongoSchema[0] = schemaObj[`_self`][`definition`][`_self`][`type`] === `Array` ? [] : {};
			processSchema(schemaObj[`_self`][`definition`], mongoSchema[0], nestedKey, specialFields);
		} else {
			mongoSchema[`type`] = schemaObj[`_self`][`type`];
			if (schemaObj[`_self`][`properties`]) {
				Object.keys(schemaObj[`_self`][`properties`]).forEach(scKey => {
					if (mongooseFields.indexOf(scKey) > -1)
						mongoSchema[scKey] = schemaObj[`_self`][`properties`][scKey];
				});
				if (mongoSchema[`enum`] && !mongoSchema[`required`]) {
					mongoSchema[`enum`].push(null);
				}
				if (mongoSchema[`enum`] && mongoSchema[`type`] == `Number`) {
					let enumVal = mongoSchema[`enum`].filter(val => val != null);
					const functionBody = mongoSchema[`required`] ? `return [${enumVal}].indexOf(value) > -1` : `return value == null || [${enumVal}].indexOf(value) > -1`;
					mongoSchema[`validate`] = [new Function(`value`, functionBody), `No enum match founds`];
				}
				if (mongoSchema[`type`] == `Number`) {
					const functionBody = `
					if(!value) return true;
                    return Number.isFinite(value);
                    `;
					const validationObj = { validator: new Function(`value`, functionBody) };
					if (mongoSchema[`validate`])
						mongoSchema[`validate`].push(validationObj);
					else {
						mongoSchema[`validate`] = [validationObj];
					}
				}
			}
			if (schemaObj[`_self`][`type`] == `Number` && schemaObj[`_self`][`properties`] && (schemaObj[`_self`][`properties`][`precision`] || schemaObj[`_self`][`properties`][`precision`] === 0)) {
				specialFields[`precisionFields`].push({ field: nestedKey, precision: schemaObj[`_self`][`properties`][`precision`] });
			}
			if (schemaObj[`_self`][`type`] == `Date`) {
				specialFields[`dateFields`].push({ field: nestedKey, dateType: schemaObj[`_self`][`properties`][`dateType`] });
			}
			if (schemaObj[`_self`][`properties`] && (schemaObj[`_self`][`properties`][`password`])) {
				specialFields[`secureFields`].push(nestedKey);
			}
		}
	} else {
		Object.keys(schemaObj).forEach(key => {
			let newNestedKey = nestedKey ? nestedKey + `.` + key : key;
			if (schemaObj[key][`type`] === `Array`) {
				mongoSchema[key] = {};
				mongoSchema[key][`type`] = [];
				if (schemaObj[key][`definition`][`_self`][`properties`] && schemaObj[key][`definition`][`_self`][`properties`][`email`]) {
					const functionBody = `
					if(value == null) return true;
					if(value.length == 0) return false;
					var re = /^(([^<>()[\\]\\\\.,;:\\s@\\"]+(\\.[^<>()[\\]\\\\.,;:\\s@\\"]+)*)|(\\".+\\"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$/i;
					
                    if(Array.isArray(value))
					{

						let flag=true;
						value.forEach(e => {
							
							flag= flag&&  re.test(e);
						});
						return flag;
					}else{
						return re.test(value);
					}`;
					const validationObj = { validator: new Function(`value`, functionBody), msg: key + ` is not a valid email` };
					if (mongoSchema[key][`validate`])
						mongoSchema[key][`validate`].push(validationObj);
					else {
						mongoSchema[key][`validate`] = [validationObj];
					}
				}
				if (schemaObj[key][`definition`][`_self`][`type`] === `Array`) {
					mongoSchema[key][`type`][0] = [];
					if (schemaObj[key][`definition`][`_self`][`properties`] && schemaObj[key][`definition`][`_self`][`properties`][`email`]) {
						const functionBody = `
						if(value == null) return true;
						if(value.length == 0) return false;
						var re = /^(([^<>()[\\]\\\\.,;:\\s@\\"]+(\\.[^<>()[\\]\\\\.,;:\\s@\\"]+)*)|(\\".+\\"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$/i;
					
                    if(Array.isArray(value))
					{

						let flag=true;
						value.forEach(e => {
							
							flag= flag&&  re.test(e);
						});
						return flag;
					}else{
						return re.test(value);
					}`;
						const validationObj = { validator: new Function(`value`, functionBody), msg: key + ` is not a valid email` };
						if (mongoSchema[key][`validate`])
							mongoSchema[key][`validate`].push(validationObj);
						else {
							mongoSchema[key][`validate`] = [validationObj];
						}
					}
				} else {
					mongoSchema[key][`type`][0] = {};
				}
				processSchema(schemaObj[key][`definition`], mongoSchema[key][`type`][0], newNestedKey, specialFields);
			} else if (schemaObj[key][`type`] === `Object`) {
				mongoSchema[key] = {};
				if (schemaObj[key][`properties`] && (schemaObj[key][`properties`][`geoType`] || schemaObj[key][`properties`][`relatedTo`] || schemaObj[key][`properties`][`fileType`] || schemaObj[key][`properties`][`password`])) {
					mongoSchema[key][`type`] = {};
					processSchema(schemaObj[key][`definition`], mongoSchema[key][`type`], newNestedKey, specialFields);
				}
				else {
					processSchema(schemaObj[key][`definition`], mongoSchema[key], newNestedKey, specialFields);
				}
			}
			else if (schemaObj[key][`type`] === `User`) {
				mongoSchema[key] = {};
				mongoSchema[key][`type`] = {};
				processSchema(schemaObj[key][`definition`], mongoSchema[key][`type`], newNestedKey, specialFields);

			}
			else {
				mongoSchema[key] = {};
				if (schemaObj[key][`properties`])
					mongoSchema[key] = filterMongooseFields(schemaObj[key][`properties`]);

				mongoSchema[key][`type`] = schemaObj[key][`type`];
			}
			if (schemaObj[key][`properties`]) {
				Object.keys(schemaObj[key][`properties`]).forEach(keyOfObj => {
					if (mongooseFields.indexOf(keyOfObj) > -1) {
						mongoSchema[key][keyOfObj] = schemaObj[key][`properties`][keyOfObj];
						if (!mongoSchema[key][`required`]) delete mongoSchema[key].required;
						if (!mongoSchema[key][`unique`]) delete mongoSchema[key].unique;
					}
				});
				if (mongoSchema[key][`enum`] && !mongoSchema[key][`required`]) {
					mongoSchema[key][`enum`].push(null);
				}
				if (mongoSchema[key][`enum`] && mongoSchema[key][`type`] == `Number`) {
					let enumVal = mongoSchema[key][`enum`].filter(val => val != null);
					const functionBody = mongoSchema[key][`required`] ? `return [${enumVal}].indexOf(value) > -1` : `return value == null || [${enumVal}].indexOf(value) > -1`;
					mongoSchema[key][`validate`] = [{ validator: new Function(`value`, functionBody), msg: `No enum match found for ` + key }];
				}
				if (mongoSchema[key][`required`] && mongoSchema[key][`type`] == `String`) {
					const functionBody = `value = _.trim(value);\n return !_.isEmpty(value);`;
					mongoSchema[key][`validate`] = [{ validator: new Function(`value`, functionBody), msg: key + ` is empty.` }];
				}
				if (schemaObj[key][`properties`][`email`]) {
					const functionBody = `
                    if(value == null) return true;
					if(value.length == 0) return false;
					var re = /^(([^<>()[\\]\\\\.,;:\\s@\\"]+(\\.[^<>()[\\]\\\\.,;:\\s@\\"]+)*)|(\\".+\\"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$/i;
					
                    if(Array.isArray(value))
					{

						let flag=true;
						value.forEach(e => {
							
							flag= flag&&  re.test(e);
						});
						return flag;
					}else{
						return re.test(value);
					}`;

					const validationObj = { validator: new Function(`value`, functionBody), msg: key + ` is not a valid email` };
					if (mongoSchema[key][`validate`])
						mongoSchema[key][`validate`].push(validationObj);
					else {
						mongoSchema[key][`validate`] = [validationObj];
					}
				}
				if (schemaObj[key][`properties`][`pattern`]) {
					let functionBody;
					if (schemaObj[key][`properties`][`password`]) {
						functionBody = `
						var re = /${schemaObj[key][`properties`][`pattern`]}/;
						if(value && value.value && value.value.trim()){
							var arr = re.exec(value.value.trim());
							if(!arr) return false;
							return (arr[0] == arr.input);
							//return re.test(value);
						}
						return true;
						`;
					} else {
						functionBody = `
						var re = /${schemaObj[key][`properties`][`pattern`]}/;
						if(value && value.trim()){
							var arr = re.exec(value.trim());
							if(!arr) return false;
							return (arr[0] == arr.input);
							//return re.test(value);
						}
						return true;
						`;
					}
					const validationObj = { validator: new Function(`value`, functionBody), msg: key + ` regex is invalid` };
					if (mongoSchema[key][`validate`])
						mongoSchema[key][`validate`].push(validationObj);
					else {
						mongoSchema[key][`validate`] = [validationObj];
					}
				}
				if (schemaObj[key][`type`] == `Number`) {
					const functionBody = `
					if(!value) return true;
                    return Number.isFinite(value);
                    `;
					const validationObj = { validator: new Function(`value`, functionBody) };
					if (mongoSchema[key][`validate`])
						mongoSchema[key][`validate`].push(validationObj);
					else {
						mongoSchema[key][`validate`] = [validationObj];
					}
				}
				if (schemaObj[key][`type`] == `Number` && schemaObj[key][`properties`] && (schemaObj[key][`properties`][`precision`] || schemaObj[key][`properties`][`precision`] === 0)) {
					specialFields[`precisionFields`].push({ field: newNestedKey, precision: schemaObj[key][`properties`][`precision`] });
				}
				if (schemaObj[key][`type`] == `Date`) {
					specialFields[`dateFields`].push({ field: newNestedKey, dateType: schemaObj[key][`properties`][`dateType`] });
				}
				if (schemaObj[key][`properties`] && schemaObj[key][`properties`][`createOnly`]) {
					specialFields[`createOnlyFields`].push(newNestedKey);
				}
				if (schemaObj[key][`properties`] && schemaObj[key][`properties`][`password`]) {
					specialFields[`secureFields`].push(newNestedKey);
				}
				if (schemaObj[key][`properties`] && schemaObj[key][`properties`][`unique`] && !schemaObj[key][`properties`][`password`]) {
					let locale = schemaObj[key][`properties`].locale || `en`;
					specialFields[`uniqueFields`].push({ key: newNestedKey, locale });
				}
				if (schemaObj[key][`properties`] && schemaObj[key][`properties`][`unique`] && (schemaObj[key][`properties`][`relatedTo`] || schemaObj[key][`type`] === `User`)) {
					delete mongoSchema[key][`unique`];
					delete mongoSchema[key][`uniqueCaseInsensitive`];
					specialFields[`relationUniqueFields`].push(newNestedKey);
				}
				if (schemaObj[key][`properties`] && schemaObj[key][`properties`][`relatedTo`] && schemaObj[key][`properties`][`required`]) {
					specialFields[`relationRequiredFields`].push(newNestedKey);
				}
				if (schemaObj[key][`properties`] && schemaObj[key][`properties`][`relatedTo`] && schemaObj[key][`properties`][`default`]) {
					mongoSchema[key][`default`] = { '_id': schemaObj[key][`properties`][`default`] };
				}
			}
		});
	}
}

let stringify = function (obj) {
	var placeholder = `____PLACEHOLDER____`;
	var fns = [];
	var json = JSON.stringify(obj, function (key, value) {
		if (typeof value === `function`) {
			fns.push(value);
			return placeholder;
		}
		return value;
	}, 4);
	json = json.replace(new RegExp(`"` + placeholder + `"`, `g`), function () {
		return fns.shift();
	});
	return json;
};

function generateDefinition(config) {
	let path = config.path,
		data = config.definition;
	var definition = {};
	let specialFields = {
		createOnlyFields: [],
		precisionFields: [],
		dateFields: [],
		secureFields: [],
		uniqueFields: [],
		relationUniqueFields: [],
		relationRequiredFields: []
	};
	try {
		processSchema(data, definition, null, specialFields);
	} catch (e) {
		logger.error(e);
		throw new Error(`Schema invalid`);
	}
	config.createOnlyFields = specialFields.createOnlyFields;
	config.precisionFields = specialFields.precisionFields;
	config.dateFields = specialFields.dateFields;
	config.secureFields = specialFields.secureFields;
	config.uniqueFields = specialFields.uniqueFields;
	config.relationUniqueFields = specialFields.relationUniqueFields;
	config.relationRequiredFields = specialFields.relationRequiredFields;
	definition[`_id`] = {
		type: `String`
	};

	definition[`_expireAt`] = {
		type: `Date`
	};
	definition[`_metadata`] = {
		type: {
			version: {
				type: {
					service: { type: `Number`, default: 0 },
					release: { type: `Number`, default: 0 }
				}
			},
			filemapper: { type: `String` },
			workflow: { type: `String` }
		}
	};

	var _id = _.camelCase(config._id);
	data = `const _ = require('lodash');\n var definition = ` + stringify(definition) + `;\nmodule.exports.definition=definition;`;
	return fileIO.writeFile(path + `/api/helpers/` + _id + `.definition.js`, data);
}

module.exports.generateDefinition = generateDefinition;