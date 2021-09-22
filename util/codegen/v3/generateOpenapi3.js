const _ = require('lodash');

const getParameters = [
	{
		name: 'page',
		in: 'query',
		schema: {
			type: 'integer'
		},
		description: 'Page number of the request'
	},
	{
		name: 'count',
		in: 'query',
		schema: {
			type: 'integer'
		},
		description: 'Number of records per page'
	},
	{
		name: 'authorization',
		in: 'header',
		schema: {
			type: 'string'
		},
		description: 'The JWT token for req.validation'
	},
	{
		name: 'filter',
		in: 'query',
		schema: {
			type: 'string'
		},
		description: 'Filter records based on certain fields'
	},
	{
		name: 'select',
		in: 'query',
		schema: {
			type: 'string'
		},
		description: 'Comma seperated fields to be displayed'
	},
	{
		name: 'sort',
		in: 'query',
		schema: {
			type: 'string'
		},
		description: 'sort parameter'
	}
];

const bulkShowParameters = [{
	name: 'id',
	in: 'query',
	schema: {
		type: 'string'
	},
	description: 'comma separated ids'
},
{
	name: 'select',
	in: 'query',
	schema: {
		type: 'string'
	},
	description: 'Comma seperated fields to be displayed'
},
{
	name: 'sort',
	in: 'query',
	schema: {
		type: 'string'
	},
	description: 'sort parameter'
},
{
	name: 'authorization',
	in: 'header',
	schema: {
		type: 'string'
	},
	description: 'The JWT token for req.validation'
}
];

const bulkDeleteParameters = [
	{
		name: 'authorization',
		in: 'header',
		schema: {
			type: 'string'
		},
		description: 'The JWT token for req.validation'
	}];

const showParameters = [{
	name: 'select',
	in: 'query',
	schema: {
		type: 'string'
	},
	description: 'Comma seperated fields to be displayed'
}, {
	name: 'id',
	in: 'path',
	schema: {
		type: 'string'
	},
	required: true,
	description: 'Id of the object to be updated',
},
{
	name: 'authorization',
	in: 'header',
	schema: {
		type: 'string'
	},
	description: 'The JWT token for req.validation'
}];

const hookParameters = [{
	name: 'url',
	in: 'query',
	schema: {
		type: 'string'
	},
	description: 'Url to hit'
}];
const experienceHookParameters = [
	{
		name: 'name',
		in: 'query',
		schema: {
			type: 'string'
		},
		description: 'name of hook to hit'
	}];

const countParameters = [{
	name: 'filter',
	in: 'query',
	schema: {
		type: 'string'
	},
	description: 'Filter records based on certain fields'
},
{
	name: 'authorization',
	in: 'header',
	schema: {
		type: 'string'
	},
	description: 'The JWT token for req.validation'
},
{
	name: 'expand',
	in: 'query',
	schema: {
		type: 'boolean',
		default: false
	},
	description: 'expand document based on relations',
}];

const exportParameters = [{
	name: 'authorization',
	in: 'header',
	schema: {
		type: 'string'
	},
	description: 'The JWT token for req.validation'
}];

function getType(type) {
	type = type == 'largeString' ? 'String' : type;
	type = type == 'String' ? 'string' : type;
	type = type == 'Number' ? 'number' : type;
	type = type == 'Boolean' ? 'boolean' : type;
	type = type == 'Date' ? 'string' : type;
	return type;
}

function getCreateDefinition(defArr) {
	let definition = [];
	if (defArr[0] && defArr[0].key == '_self') {
		let attribute = defArr[0];
		if (attribute['type'] === 'Object') {
			definition = getCreateDefinition(attribute['definition']);
		}
		else if (attribute['type'] === 'User') {
			definition = getCreateDefinition(attribute['definition']);
		} else if (attribute['type'] === 'Array') {
			if (attribute['definition'][0]['type'] === 'Array') {
				definition = {
					type: 'array',
					items: getCreateDefinition(attribute['definition']),
					nullable: true
				};
			} else {
				definition = getCreateDefinition(attribute['definition']);
			}
		} else {
			definition.type = getType(attribute['type']);
		}
		return definition;
	}
	definition = {
		properties: {},
		required: []
	};
	defArr.forEach(attribute => {
		let el = attribute.key;
		if (attribute['properties'] && attribute['properties']['required']) {
			definition.required.push(el);
		}
		if (el == '_id') {
			attribute['type'] = 'string';
		}
		if (attribute['type'] === 'Object') {
			definition['properties'][el] = getCreateDefinition(attribute.definition);
		}
		else if (attribute['type'] === 'User') {
			definition['properties'][el] = getCreateDefinition(attribute.definition);
		} else if (attribute['type'] == 'Array') {
			if (attribute['definition'][0]['type'] === 'Array') {
				definition['properties'][el] = {
					type: 'array',
					items: {
						type: 'array',
						items: getCreateDefinition(attribute['definition']),
						nullable: true
					},
					nullable: true
				};
			} else if (attribute['definition'][0]['type'] === 'Object') {
				definition['properties'][el] = {
					type: 'array',
					items: getCreateDefinition(attribute['definition']),
					nullable: true
				};
			}
			else if (attribute['definition'][0]['type'] === 'User') {
				definition['properties'][el] = {
					type: 'array',
					items: getCreateDefinition(attribute['definition']),
					nullable: true
				};
			} else {
				definition['properties'][el] = {
					type: 'array',
					items: {
						type: getType(attribute['definition'][0]['type'])
					},
					nullable: true
				};
				if(attribute['definition'][0]['properties']){
					definition['properties'][el]['description'] = attribute['definition'][0]['properties']['_description'];
				}
				if (attribute['definition'][0]['properties']) {
					definition['properties'][el]['minLength'] = attribute['definition'][0]['properties']['minlength'];
				}
				if (attribute['definition'][0]['properties']) {
					definition['properties'][el]['maxLength'] = attribute['definition'][0]['properties']['maxlength'];
				}
				if(attribute['definition'][0]['properties']){
					//
					definition['properties'][el]['pattern'] = attribute['definition'][0]['properties']['pattern'];
				}
			}
		} else {
			if (attribute['properties'] && (attribute['properties']['required'])) {
				definition['properties'][el] = {
					type: getType(attribute['type'])
				};
				if(attribute['properties']['_description']){
					definition['properties'][el]['description'] = attribute['properties']['_description'];
				}
				if (attribute['properties']['minlength']) {
					definition['properties'][el]['minLength'] = attribute['properties']['minlength'];
				}
				if (attribute['properties']['maxlength']) {
					definition['properties'][el]['maxLength'] = attribute['properties']['maxlength'];
				}
				if(attribute['properties']['pattern']){
					//
					definition['properties'][el]['pattern'] = attribute['properties']['pattern'];
				}
			} else {
				definition['properties'][el] = {
					type: getType(attribute['type']),
					nullable: true
				};
				if(attribute['properties']['_description']){
					definition['properties'][el]['description'] = attribute['properties']['_description'];
				}
				if (attribute['properties']['minlength']) {
					definition['properties'][el]['minLength'] = parseInt(attribute['properties']['minlength']);
				}
				if (attribute['properties']['maxlength']) {
					definition['properties'][el]['maxLength'] = parseInt(attribute['properties']['maxlength']);
				}
				if(attribute['properties']['pattern']){
					//
					definition['properties'][el]['pattern'] = attribute['properties']['pattern'];
				}
			}
			if (attribute['properties'] && attribute['properties']['enum']) {
				definition['properties'][el]['enum'] = attribute['properties']['enum'];
			}
		}
	});
	if (definition.required.length === 0)
		delete definition.required;
	return definition;
}

function getMathKeyList(defArr, key) {
	let list = [];
	defArr.forEach(attribute => {
		let _k = attribute.key;
		let newKey = key == '' ? _k : key + '.' + _k;
		if (attribute['type'] === 'Object') {
			list = list.concat(getMathKeyList(attribute['definition'], newKey));
		} else if (attribute['type'] === 'Number') {
			list.push(newKey);
		}
	});
	return list;
}

function getUpdateDefinition(def) {
	if (def.constructor == {}.constructor && def['required']) {
		delete def.required;
	}
	if(Array.isArray(def)) {
		def.forEach(attr => {
			if (attr != null && typeof attr === 'object')
				getUpdateDefinition(attr);
		});
	} else if(def.constructor == {}.constructor) {
		Object.keys(def).forEach(key => {
			if (def[key] != null && typeof def[key] === 'object')
				getUpdateDefinition(def[key]);
		});
	}
}

function generateYaml(config) {
	var createDefinition = getCreateDefinition(config.definition);
	var updateDefinition = JSON.parse(JSON.stringify(createDefinition));
	let mathKeyList = getMathKeyList(JSON.parse(JSON.stringify(config.definition)), '');
	let mathDefinition = null;
	if (mathKeyList.length > 0) {
		let mathKeyObject = {};
		mathKeyList.forEach(_k => {
			mathKeyObject[_k] = { 'type': 'number' };
		});
		mathDefinition = { 'properties': { '$inc': { 'type': 'object', 'properties': JSON.parse(JSON.stringify(mathKeyObject)) }, '$mul': { 'type': 'object', 'properties': JSON.parse(JSON.stringify(mathKeyObject)) } } };
	}
	getUpdateDefinition(updateDefinition);
	var basePath = config.api.charAt(0) === '/' ? config.api : '/' + config.api;
	var swagger = {
		openapi: '3.0.0',
		info: {
			version: `${config.version}`,
			title: config.name + ' API'
		},
		servers: [{
			url: 'http://' + 'localhost:' + config.port + '/' + config.app + basePath
		}],
		paths: {},
		components: {}
	};
	swagger.components.schemas = {};
	var name = _.camelCase(config.name);
	swagger.components['schemas'][`${name}_create`] = createDefinition;
	swagger.components['schemas'][`${name}_update`] = updateDefinition;
	if (mathDefinition) swagger.components['schemas'][`${name}_math`] = mathDefinition;
	swagger.components['schemas']['mapping'] = {
		'properties': {
			'headers': {
				'type': 'string'
			},
			'headerMapping': {
				'type': 'string'
			}
		}
	};
	// swagger.components['enrichData'] = {
	// 	'properties': {
	// 		'sheetData': {
	// 			'type': ['array'],
	// 			'items': {
	// 				'type': 'object'
	// 			}
	// 		},
	// 		'headerMapping': {
	// 			'type': ['object']
	// 		}
	// 	}
	// };
	swagger.components['schemas']['bulkCreateData'] = {
		'properties': {
			'fileId': {
				'type': 'string'
			}
		}
	};
	let expandOption = {
		name: 'expand',
		in: 'query',
		schema: {
			type: 'boolean',
			default: false
		},
		description: 'expand document based on relations',
	};

	let totalRecord = {
		name: 'totalRecords',
		in: 'query',
		schema: {
			type: 'integer'
		},
		description: 'total records',
	};

	let searchOption = {
		name: 'search',
		in: 'query',
		schema: {
			type: 'string'
		},
		description: 'String to search across all field'
	};
	swagger.paths['/'] = {
		'get': {
			description: `Retrieve a list of '${config.name}'`,
			parameters: config.enableSearchIndex ? JSON.parse(JSON.stringify(getParameters)).concat([expandOption, searchOption]) : JSON.parse(JSON.stringify(getParameters)).concat([expandOption]),
			responses: {
				'200': {
					description: 'List of the entites'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		},
		'post': {
			description: `Create a new '${config.name}'`,
			requestBody: {
				description: `Payload to create a '${config.name}'`,
				content: {
					'application/json': {
						schema: {
							$ref: `#/components/schemas/${name}_create`
						}
					}
				}
			},
			parameters: [{
				name: 'authorization',
				in: 'header',
				schema: {
					type: 'string'
				},
				description: 'The JWT token for req.validation'
			},
			{
				name: 'expireAt',
				in: 'query',
				schema: {
					type: 'string',
					format: 'date'
				},
				description: 'ISO format date after which the document will get deleted'
			},
			{
				name: 'expireAfter',
				in: 'query',
				schema: {
					type: 'string'
				},
				description: 'Time after which the document will get deleted.'
			},
			{
				name: 'upsert',
				in: 'query',
				schema: {
					type: 'boolean'
				},
				description: 'upsert parameter'
			}],
			responses: {
				'200': {
					description: 'List of the entites created'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	swagger.paths['/{id}'] = {
		'get': {
			description: `Retrieve an existing '${config.name}'`,
			parameters: showParameters.concat([{
				name: 'expand',
				in: 'query',
				schema: {
					type: 'boolean',
					default: false
				},
				description: 'expand document based on relations',
			}]),
			responses: {
				'200': {
					description: `${config.name} document`
				},
				'400': {
					description: 'Bad parameters'
				},
				'404': {
					description: 'No records to list with the given parameter set.'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		},
		'put': {
			description: `Update an existing '${config.name}'`,
			requestBody: {
				description: `Payload to update a '${config.name}'`,
				content: {
					'application/json': {
						schema: {
							$ref: `#/components/schemas/${name}_update`
						}
					}
				}
			},
			parameters: [{
				name: 'id',
				in: 'path',
				schema: {
					type: 'string'
				},
				required: true,
				description: `Id of the '${config.name}' to be updated`,
			},
			{
				name: 'authorization',
				in: 'header',
				schema: {
					type: 'string'
				},
				description: 'The JWT token for req.validation'
			},
			{
				name: 'expireAt',
				in: 'query',
				schema: {
					type: 'string'
				},
				description: 'ISO format date after which the document will get deleted'
			},
			{
				name: 'expireAfter',
				in: 'query',
				schema: {
					type: 'string'
				},
				description: 'Time after which the document will get deleted.'
			},{
				name: 'upsert',
				in: 'query',
				schema: {
					type: 'boolean'
				},
				description: 'upsert parameter'
			}],
			responses: {
				'200': {
					description: 'Update entry'
				},
				'400': {
					description: 'Bad parameters'
				},
				'404': {
					description: 'No records to list with the given parameter set.'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		},
		'delete': {
			description: `Delete an existing '${config.name}'`,
			parameters: [{
				name: 'id',
				in: 'path',
				schema: {
					type: 'string'
				},
				required: true,
				description: `Id of the '${config.name}' to be deleted`,
			},
			{
				name: 'authorization',
				in: 'header',
				schema: {
					type: 'string'
				},
				description: 'The JWT token for req.validation'
			}],
			responses: {
				'200': {
					description: 'Empty object'
				},
				'400': {
					description: 'Bad parameters'
				},
				'404': {
					description: 'No records to list with the given parameter set.'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	if (mathDefinition) {
		swagger.paths['/{id}/math'] = {
			'put': {
				description: `Does math operation on a '${config.name}'`,
				requestBody: {
					description: `Payload to update a '${config.name}'`,
					content: {
						'application/json': {
							schema: {
								$ref: `#/components/schemas/${name}_math`
							}
						}
					}
				},
				parameters: [{
					name: 'id',
					in: 'path',
					schema: {
						type: 'string'
					},
					required: true,
					description: `Id of the '${config.name}' to be updated`,
				},
				{
					name: 'authorization',
					in: 'header',
					schema: {
						type: 'string'
					},
					description: 'The JWT token for req.validation'
				}],
				responses: {
					'200': {
						description: 'Update entry'
					},
					'400': {
						description: 'Bad parameters'
					},
					'404': {
						description: 'No records to list with the given parameter set.'
					},
					'500': {
						description: 'Internal server error'
					}
				}
			}
		};
	}
	swagger.paths['/utils/aggregate'] = {
		'post': {
			description: 'runs aggregate query',
			requestBody: {
				description: 'Payload to aggregate',
				content: {
					'application/json': {
						schema: {
							'type': 'array',
							'items': {
								'type': 'object'
							}
						}
					}
				}
			},
			parameters: [{
				name: 'authorization',
				in: 'header',
				schema: {
					type: 'string'
				},
				description: 'The JWT token for req.validation'
			}],
			responses: {
				'200': {
					description: 'List of the entites'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	swagger.paths['/utils/bulkDelete'] = {
		'post': {
			description: `Deletes a list of '${name}'`,
			requestBody: {
				description: 'Payload to reset a User',
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								ids: {
									type: 'array',
									items: {
										type: 'string'
									}
								}
							}
						}
					}
				}
			},
			parameters: bulkDeleteParameters,
			responses: {
				'200': {
					description: 'Empty Object'
				},
				'400': {
					description: 'List document ids not deleted'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	swagger.paths['/utils/bulkShow'] = {
		'get': {
			description: `Retrieve a list of '${config.name}'`,
			parameters: bulkShowParameters,
			responses: {
				'200': {
					description: 'List of the entites'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	swagger.paths['/utils/count'] = {
		'get': {
			description: `returns count of '${config.name}'`,

			parameters: countParameters,
			responses: {
				'200': {
					description: 'Count of the entites'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	swagger.paths['/utils/experienceHook'] = {
		'post': {
			description: 'triggers the hook with data',

			requestBody: {
				description: 'data',
				content: {
					'application/json': {
						schema: {
							type: 'object'
						},
					}
				}
			},
			parameters: experienceHookParameters,
			responses: {
				'200': {
					description: 'List of the entites'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	swagger.paths['/utils/export'] = {
		'post': {
			description: `Retrieve a list of '${config.name}'`,
			requestBody: {
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								filter: {
									type: 'string'
								},
								select: {
									type: 'string'
								},
								sort: {
									type: 'string'
								},
								skip: {
									type: 'integer'
								},
								batchsize: {
									type: 'integer'
								}
							}
						}
					}
				}
			},
			parameters: config.enableSearchIndex ? JSON.parse(JSON.stringify(exportParameters)).concat([expandOption, searchOption, totalRecord]) : JSON.parse(JSON.stringify(exportParameters)).concat([expandOption, totalRecord]),
			responses: {
				'200': {
					description: 'List of the entites'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	swagger.paths['/utils/export/download/{id}'] = {
		'get': {
			description: 'Download the file',
			parameters: [{
				name: 'id',
				in: 'path',
				schema: {
					type: 'string'
				},
				required: true,
				description: 'Id of file',
			}, {
				name: 'filename',
				in: 'query',
				schema: {
					type: 'string'
				},
				description: 'filename of file',
			}],
			responses: {
				'200': {
					description: 'file download'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	swagger.paths['/utils/fileMapper/{fileId}/count'] = {
		'get': {
			description: `returns count of '${config.name}'`,
			parameters: countParameters.concat({
				name: 'fileId',
				in: 'path',
				required: true,
				schema: {
					type: 'string'
				},
				description: 'fileId against which we db will be querried'
			}),
			responses: {
				'200': {
					description: 'Count of the entites'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	swagger.paths['/utils/fileTransfers'] = {
		'get': {
			description: 'Retrieve list of bulk actions\'',
			parameters: JSON.parse(JSON.stringify(getParameters)),
			responses: {
				'200': {
					description: 'List of the entites'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	swagger.paths['/utils/fileTransfers/{id}'] = {
		'delete': {
			description: 'Deletes a file with file id',
			parameters: [{
				name: 'id',
				in: 'path',
				schema: {
					type: 'string'
				},
				required: true,
				description: 'Id of file',
			}, {
				name: 'authorization',
				in: 'header',
				schema: {
					type: 'string'
				},
				description: 'The JWT token for req.validation'
			}],
			responses: {
				'200': {
					description: 'List of the entites'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	swagger.paths['/utils/fileTransfers/{fileId}/readStatus'] = {
		'put': {
			description: 'Updates File Read Status',
			requestBody: {
				description: 'Payload with read status',
				content: {
					'application/json': {
						schema: {
							properties: {
								'isRead': {
									'type': 'boolean',
								}
							}
						}
					}
				}
			},
			parameters: [{
				name: 'fileId',
				in: 'path',
				schema: {
					type: 'string'
				},
				required: true,
				description: 'Id of file',
			}, {
				name: 'authorization',
				in: 'header',
				schema: {
					type: 'string'
				},
				description: 'The JWT token for req.validation'
			}],
			responses: {
				'200': {
					description: 'File read status updated'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	swagger.paths['/utils/fileTransfers/count'] = {
		'get': {
			description: 'count of bulk actions\'',
			parameters: JSON.parse(JSON.stringify(getParameters)),
			responses: {
				'200': {
					description: 'List of the entites'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	swagger.paths['/utils/hook'] = {
		'post': {
			description: 'triggers the hook with data',
			requestBody: {
				content: {
					'application/json': {
						schema: {
							type: 'object'
						}
					}
				},
				description: 'data'
			},
			parameters: hookParameters,
			responses: {
				'200': {
					description: 'List of the entites'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	swagger.paths['/utils/securedFields'] = {
		'get': {
			description: `Retrieve a list of secured fields in '${config.name}'`,
			responses: {
				'200': {
					description: 'List of the entites'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	swagger.paths['/utils/simulate'] = {
		'post': {
			description: `validate '${config.name}'`,
			requestBody: {
				description: `Payload to validate '${config.name}'`,
				content: {
					'application/json': {
						schema: {
							$ref: `#/components/schemas/${name}_update`
						}
					}
				}
			},
			parameters: [{
				name: 'authorization',
				in: 'header',
				schema: {
					type: 'string'
				},
				description: 'The JWT token for req.validation'
			},
			{
				name: 'generateId',
				in: 'query',
				schema: {
					type: 'boolean',
					default: false
				},
				description: 'Generate Id for the document',
			},
			{
				name: 'operation',
				in: 'query',
				schema: {
					type: 'string',
					default: false
				},
				description: 'request method',
			},
			{
				name: 'docId',
				in: 'query',
				schema: {
					type: 'string',
					default: false
				},
				description: 'request method',
			},
			{
				name: 'select',
				in: 'query',
				schema: {
					type: 'string',
					default: false
				},
				description: 'select in case of get',
			}],
			responses: {
				'200': {
					description: 'List of the entites'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			}
		}
	};
	// Was Used by WF Module
	// swagger.paths['/utils/lock'] = {
	// 	'x-swagger-router-controller': `${methodName.controller}`,
	// 	'put': {
	// 		description: `lock '${config.name}'`,
	// 		operationId: `${methodName.lock}`,
	// 		parameters: [{
	// 			name: 'data',
	// 			in: 'body',
	// 			description: `Payload to validate '${config.name}'`,
	// 			schema: {
	// 				properties: {
	// 					'id': {
	// 						'type': 'string',
	// 					},
	// 					'wfId': {
	// 						'type': ['string', 'null'],
	// 					}
	// 				}
	// 			}
	// 		},
	// 		{
	// 			name: 'authorization',
	// 			in: 'header',
	// 			type: 'string',
	// 			description: 'The JWT token for req.validation'
	// 		}],
	// 		responses: {
	// 			'200': {
	// 				description: 'List of the entites'
	// 			},
	// 			'400': {
	// 				description: 'Bad parameters'
	// 			},
	// 			'500': {
	// 				description: 'Internal server error'
	// 			}
	// 		}
	// 	}
	// };
	// swagger.paths['/utils/file/upload'] = {
	// 	'x-swagger-router-controller': `${methodName.controller}`,
	// 	'post': {
	// 		description: 'Uploads the file',
	// 		operationId: `${methodName.fileUpload}`,
	// 		parameters: [
	// 			{
	// 				name: 'authorization',
	// 				in: 'header',
	// 				type: 'string',
	// 				description: 'The JWT token for req.validation'
	// 			}
	// 		],
	// 		responses: {
	// 			'200': {
	// 				description: 'meta data of file'
	// 			},
	// 			'400': {
	// 				description: 'Bad parameters'
	// 			},
	// 			'500': {
	// 				description: 'Internal server error'
	// 			}
	// 		}
	// 	}
	// };

	// swagger.paths['/utils/file/{id}/view'] = {
	// 	'x-swagger-router-controller': `${methodName.controller}`,
	// 	'get': {
	// 		description: 'View the file',
	// 		parameters: [{
	// 			name: 'id',
	// 			in: 'path',
	// 			type: 'string',
	// 			required: true,
	// 			description: 'Id of file',
	// 		}, {
	// 			name: 'authorization',
	// 			in: 'header',
	// 			type: 'string',
	// 			description: 'The JWT token for req.validation'
	// 		}],
	// 		operationId: `${methodName.fileView}`,
	// 		responses: {
	// 			'200': {
	// 				description: 'file data'
	// 			},
	// 			'400': {
	// 				description: 'Bad parameters'
	// 			},
	// 			'500': {
	// 				description: 'Internal server error'
	// 			}
	// 		}
	// 	}
	// };

	// swagger.paths['/utils/file/download/{id}'] = {
	// 	'x-swagger-router-controller': `${methodName.controller}`,
	// 	'get': {
	// 		description: 'Download the file',
	// 		parameters: [{
	// 			name: 'id',
	// 			in: 'path',
	// 			type: 'string',
	// 			required: true,
	// 			description: 'Id of file',
	// 		}],
	// 		operationId: `${methodName.fileDownload}`,
	// 		responses: {
	// 			'200': {
	// 				description: 'file download'
	// 			},
	// 			'400': {
	// 				description: 'Bad parameters'
	// 			},
	// 			'500': {
	// 				description: 'Internal server error'
	// 			}
	// 		}
	// 	}
	// };

	// swagger.paths['/utils/fileMapper/{fileId}'] = {
	// 	'x-swagger-router-controller': `${methodName.controller}`,
	// 	'get': {
	// 		description: `Retrieve a list of '${config.name}'`,
	// 		operationId: 'fileMapperList',
	// 		parameters: JSON.parse(JSON.stringify(getParameters.concat({
	// 			name: 'fileId',
	// 			in: 'path',
	// 			required: true,
	// 			type: 'string',
	// 			description: 'fileId against which we db will be querried'
	// 		}))),
	// 		responses: {
	// 			'200': {
	// 				description: 'List of the entites'
	// 			},
	// 			'400': {
	// 				description: 'Bad parameters'
	// 			},
	// 			'500': {
	// 				description: 'Internal server error'
	// 			}
	// 		}
	// 	}
	// };
	// swagger.paths['/utils/fileMapper/{fileId}/create'] = {
	// 	'x-swagger-router-controller': `${methodName.controller}`,
	// 	'post': {
	// 		description: 'Create the data in the file',
	// 		operationId: 'v1_bulkCreate',
	// 		parameters: [{
	// 			name: 'data',
	// 			in: 'body',
	// 			description: 'Payload to bulkCreate',
	// 			schema: {
	// 				$ref: '#/components/bulkCreateData'
	// 			}
	// 		}, {
	// 			name: 'authorization',
	// 			in: 'header',
	// 			type: 'string',
	// 			description: 'The JWT token for req.validation'
	// 		}, {
	// 			name: 'fileId',
	// 			in: 'path',
	// 			required: true,
	// 			type: 'string',
	// 			description: 'fileId against which we db will be querried'
	// 		}],
	// 		responses: {
	// 			'200': {
	// 				description: 'Stats of bulkCreate'
	// 			},
	// 			'400': {
	// 				description: 'Bad parameters'
	// 			},
	// 			'500': {
	// 				description: 'Internal server error'
	// 			}
	// 		}
	// 	}
	// };
	// swagger.paths['/utils/fileMapper/{fileId}/mapping'] = {
	// 	'x-swagger-router-controller': `${methodName.controller}`,
	// 	'put': {
	// 		description: 'Uploads the file containing data',
	// 		operationId: 'v1_mapping',
	// 		parameters: [
	// 			{
	// 				name: 'data',
	// 				in: 'body',
	// 				description: 'Payload to validate data',
	// 				schema: {
	// 					type: 'object'
	// 				}
	// 			},
	// 			{
	// 				name: 'authorization',
	// 				in: 'header',
	// 				type: 'string',
	// 				description: 'The JWT token for req.validation'
	// 			}, {
	// 				name: 'fileId',
	// 				in: 'path',
	// 				required: true,
	// 				type: 'string',
	// 				description: 'fileId against which we db will be querried'
	// 			}],
	// 		responses: {
	// 			'200': {
	// 				description: 'Data validated against mapping'
	// 			},
	// 			'400': {
	// 				description: 'Bad parameters'
	// 			},
	// 			'500': {
	// 				description: 'Internal server error'
	// 			}
	// 		}
	// 	}
	// };



	// Was used by WF module
	// swagger.paths['/utils/fileMapper/enrich'] = {
	// 	'x-swagger-router-controller': `${methodName.controller}`,
	// 	'put': {
	// 		description: 'Enrich the sheet data',
	// 		operationId: 'v1_enrichData',
	// 		parameters: [{
	// 			name: 'data',
	// 			in: 'body',
	// 			description: 'Payload to validate data',
	// 			schema: {
	// 				$ref: '#/components/enrichData'
	// 			}
	// 		}, {
	// 			name: 'authorization',
	// 			in: 'header',
	// 			type: 'string',
	// 			description: 'The JWT token for req.validation'
	// 		}],
	// 		responses: {
	// 			'200': {
	// 				description: 'Data enriched against mapping'
	// 			},
	// 			'400': {
	// 				description: 'Bad parameters'
	// 			},
	// 			'500': {
	// 				description: 'Internal server error'
	// 			}
	// 		}
	// 	}
	// };
	// swagger.paths['/utils/fileMapper/{fileId}/enrichDataForWF'] = {
	// 	'x-swagger-router-controller': `${methodName.controller}`,
	// 	'get': {
	// 		description: 'Enrich the sheet data for Record ID',
	// 		operationId: 'v1_enrichDataForWF',
	// 		parameters: [{
	// 			name: 'page',
	// 			in: 'query',
	// 			type: 'integer',
	// 			description: 'Page number of the request'
	// 		}, {
	// 			name: 'authorization',
	// 			in: 'header',
	// 			type: 'string',
	// 			description: 'The JWT token for req.validation'
	// 		}, {
	// 			name: 'count',
	// 			in: 'query',
	// 			type: 'integer',
	// 			description: 'Number of records per page'
	// 		}, {
	// 			name: 'fileId',
	// 			in: 'path',
	// 			required: true,
	// 			type: 'string',
	// 			description: 'fileId against which we db will be querried'
	// 		}, {
	// 			name: 'operation',
	// 			in: 'query',
	// 			type: 'string',
	// 			description: 'request method',
	// 			default: 'false'
	// 		}, {
	// 			name: 'filter',
	// 			in: 'query',
	// 			type: 'string',
	// 			description: 'filter'
	// 		}],
	// 		responses: {
	// 			'200': {
	// 				description: 'Data enriched against mapping'
	// 			},
	// 			'400': {
	// 				description: 'Bad parameters'
	// 			},
	// 			'500': {
	// 				description: 'Internal server error'
	// 			}
	// 		}
	// 	}
	// };
	// swagger.paths['/utils/hrefUpdate'] = {
	// 	'x-swagger-router-controller': `${methodName.controller}`,
	// 	'put': {
	// 		description: 'Update url of outgoing relations',
	// 		operationId: 'v1_updateHref',
	// 		parameters: [{
	// 			name: 'data',
	// 			in: 'body',
	// 			description: 'Payload to update href',
	// 			schema: {
	// 				'type': 'object'
	// 			}
	// 		}],
	// 		responses: {
	// 			'200': {
	// 				description: 'List of the entites'
	// 			},
	// 			'400': {
	// 				description: 'Bad parameters'
	// 			},
	// 			'500': {
	// 				description: 'Internal server error'
	// 			}
	// 		}
	// 	}
	// };
	// swagger.paths['/utils/health/live'] = {
	// 	'x-swagger-router-controller': `${methodName.controller}`,
	// 	'get': {
	// 		description: 'Healthcheck API for service',
	// 		operationId: `${methodName.healthCheck}`,
	// 		responses: {
	// 			'200': {
	// 				description: 'Success'
	// 			},
	// 			'400': {
	// 				description: 'Error'
	// 			}
	// 		}
	// 	}
	// };

	// swagger.paths['/utils/health/ready'] = {
	// 	'x-swagger-router-controller': `${methodName.controller}`,
	// 	'get': {
	// 		description: 'Healthcheck API for service',
	// 		operationId: `${methodName.readinessCheck}`,
	// 		responses: {
	// 			'200': {
	// 				description: 'Success'
	// 			},
	// 			'400': {
	// 				description: 'Error'
	// 			}
	// 		}
	// 	}
	// };
	return swagger;
}

module.exports.generateYaml = generateYaml;