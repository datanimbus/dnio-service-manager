const _ = require('lodash');
const getParameters = [
	{
		name: 'page',
		in: 'query',
		description: 'Page number of the request',
		schema: { type: 'integer' }
	},
	{
		name: 'count',
		in: 'query',
		description: 'Number of records per page',
		schema: { type: 'integer' }
	},
	{
		name: 'filter',
		in: 'query',
		description: 'Filter records based on certain fields',
		schema: { type: 'string' }
	},
	{
		name: 'select',
		in: 'query',
		description: 'Comma seperated fields to be displayed',
		schema: { type: 'string' }
	},
	{
		name: 'sort',
		in: 'query',
		description: 'sort parameter',
		schema: { type: 'string' }
	}
];

const bulkShowParameters = [
	{
		name: 'id',
		in: 'query',
		description: 'comma separated ids',
		schema: { type: 'string' }
	},
	{
		name: 'select',
		in: 'query',
		description: 'Comma seperated fields to be displayed',
		schema: { type: 'string' }
	},
	{
		name: 'sort',
		in: 'query',
		description: 'sort parameter',
		schema: { type: 'string' }
	}
];

const showParameters = [
	{
		name: 'select',
		in: 'query',
		description: 'Comma seperated fields to be displayed',
		schema: { type: 'string' }
	},
	{
		name: 'id',
		in: 'path',
		required: true,
		description: 'Id of the object to be updated',
		schema: { type: 'string' }
	}
];

const hookParameters = [
	{
		name: 'url',
		in: 'query',
		description: 'Url to hit',
		schema: { type: 'string' }
	}
];

const experienceHookParameters = [
	{
		name: 'name',
		in: 'query',
		description: 'name of hook to hit',
		schema: { type: 'string' }
	}
];

const countParameters = [
	{
		name: 'filter',
		in: 'query',
		description: 'Filter records based on certain fields',
		schema: { type: 'string' }
	},
	{
		name: 'expand',
		in: 'query',
		description: 'expand document based on relations',
		schema: {
			type: 'boolean',
			default: false
		},
	}
];

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
					nullable: true,
					items: getCreateDefinition(attribute['definition'])
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
			if (attribute.properties.schemaFree) {
				definition['properties'][el] = {
					type: 'object'
				}
			} else {
				definition['properties'][el] = getCreateDefinition(attribute.definition);
			}
		}
		else if (attribute['type'] === 'User') {
			definition['properties'][el] = getCreateDefinition(attribute.definition);
		} else if (attribute['type'] == 'Array') {
			if (attribute['definition'][0]['type'] === 'Array') {
				definition['properties'][el] = {
					type: 'array',
					nullable: true,
					items: {
						type: 'array',
						nullable: true,
						items: getCreateDefinition(attribute['definition'])
					}
				};
			} else if (attribute['definition'][0]['type'] === 'Object') {
				definition['properties'][el] = {
					type: 'array',
					nullable: true,
					items: getCreateDefinition(attribute['definition'])
				};
			}
			else if (attribute['definition'][0]['type'] === 'User') {
				definition['properties'][el] = {
					type: 'array',
					nullable: true,
					items: getCreateDefinition(attribute['definition'])
				};
			} else {
				definition['properties'][el] = {
					type: 'array',
					nullable: true,
					items: {
						type: getType(attribute['definition'][0]['type'])
					}
				};
			}
		} else {
			if (attribute['properties'] && (attribute['properties']['required'])) {
				definition['properties'][el] = {
					type: getType(attribute['type'])
				};
			} else {
				definition['properties'][el] = {
					type: getType(attribute['type']),
					nullable: true
				};
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
		if (attribute['type'] === 'Object' && !attribute.properties.schemaFree) {
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
	if (Array.isArray(def)) {
		def.forEach(attr => {
			if (attr != null && typeof attr === 'object')
				getUpdateDefinition(attr);
		});
	} else if (def.constructor == {}.constructor) {
		Object.keys(def).forEach(key => {
			if (def[key] != null && typeof def[key] === 'object')
				getUpdateDefinition(def[key]);
		});
	}
}

function getMethodNames(config) {
	var name = _.camelCase(config._id);
	var obj = {};
	obj.create = `v1_${name}Create`;
	obj.exportAll = `v1_${name}Export`;
	obj.exportAllDetail = `v1_${name}ExportDetails`;
	obj.exportAllDetailCount = `v1_${name}ExportDetailsCount`;
	obj.exportAllDetailDelete = `v1_${name}ExportDetailsDelete`;
	obj.list = `v1_${name}List`;
	obj.show = `v1_${name}Show`;
	obj.update = `v1_${name}Update`;
	obj.hook = `v1_${name}Hook`;
	obj.experienceHook = `v1_${name}ExperienceHook`;
	obj.math = `v1_${name}Math`;
	obj.destroy = `v1_${name}Destroy`;
	obj.count = `v1_${name}Count`;
	obj.bulkShow = `v1_${name}BulkShow`;
	obj.securedFields = `v1_${name}SecuredFields`;
	obj.bulkDelete = `v1_${name}BulkDelete`;
	obj.bulkUpdate = `v1_${name}BulkUpdate`;
    obj.bulkUpsert = `v1_${name}BulkUpsert`;
	obj.fileUpload = `v1_${name}FileUpload`;
	obj.fileView = `v1_${name}FileView`;
	obj.fileDownload = `v1_${name}FileDownload`;
	obj.exportFileileDownload = `v1_${name}ExportedFileDownload`;
	obj.fileRemove = `v1_${name}FileRemove`;
	obj.healthCheck = `v1_${name}HealthCheck`;
	obj.readinessCheck = `v1_${name}ReadinessCheck`;
	obj.simulate = `v1_${name}Simulate`;
	obj.lock = `v1_${name}LockDocument`;
	obj.controller = 'controller';
	return obj;
}

function generateYaml(config) {
	var methodName = getMethodNames(config);
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
		servers: [{ 'url': `http://localhost:${config.port}/${config.app}${basePath}` }],
		paths: {},
		components: {}
	};
	let schemas = {}
	let securitySchemes = {};
	var name = _.camelCase(config.name);
	schemas[`${name}_create`] = createDefinition;
	schemas[`${name}_update`] = updateDefinition;
	if (mathDefinition) schemas[`${name}_math`] = mathDefinition;
	schemas['mapping'] = {
		'properties': {
			'headers': {
				'type': 'string'
			},
			'headerMapping': {
				'type': 'string'
			}
		}
	};
	// swagger.definitions['enrichData'] = {
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
	schemas['bulkCreateData'] = {
		'properties': {
			'fileId': {
				'type': 'string'
			}
		}
	};
	securitySchemes['bearerAuth'] = {
		'type': 'http',
		'scheme': 'bearer',
		'bearerFormat': 'JWT'
	}

	swagger.components.securitySchemes = securitySchemes
	swagger.components.schemas = schemas;

	let expandOption = {
		name: 'expand',
		in: 'query',
		description: 'expand document based on relations',
		schema: {
			type: 'boolean',
			default: false
		}
	};

	let totalRecord = {
		name: 'totalRecords',
		in: 'query',
		description: 'total records',
		schema: { type: 'integer' }
	};

	let searchOption = {
		name: 'search',
		in: 'query',
		description: 'String to search across all field',
		schema: { type: 'string' }
	};

	swagger.paths['/'] = {
		'x-swagger-router-controller': `${methodName.controller}`,
		'get': {
			description: `Retrieve a list of '${config.name}'`,
			operationId: `${methodName.list}`,
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
			},
			security: [
				{
					"bearerAuth": []
				}
			]
		},
		'post': {
			description: `Create a new '${config.name}'`,
			operationId: `${methodName.create}`,
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
				name: 'expireAt',
				in: 'query',
				description: 'ISO format date after which the document will get deleted',
				schema: { type: 'string' }
			},
			{
				name: 'expireAfter',
				in: 'query',
				description: 'Time after which the document will get deleted.',
				schema: { type: 'string' }
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
			},
			security: [
				{
					"bearerAuth": []
				}
			]
		}
	};

	swagger.paths['/{id}'] = {
		'x-swagger-router-controller': `${methodName.controller}`,
		'get': {
			description: `Retrieve an existing '${config.name}'`,
			operationId: `${methodName.show}`,
			parameters: showParameters.concat([{
				name: 'expand',
				in: 'query',
				description: 'expand document based on relations',
				schema: {
					type: 'boolean',
					default: false
				},
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
			},
			security: [
				{
					"bearerAuth": []
				}
			]
		},
		'put': {
			description: `Update an existing '${config.name}'`,
			operationId: `${methodName.update}`,
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
				required: true,
				description: `Id of the '${config.name}' to be updated`,
				schema: { type: 'string' }
			},
			{
				name: 'expireAt',
				in: 'query',
				description: 'ISO format date after which the document will get deleted',
				schema: { type: 'string' }
			},
			{
				name: 'expireAfter',
				in: 'query',
				description: 'Time after which the document will get deleted.',
				schema: { type: 'string' }
			}, {
				name: 'upsert',
				in: 'query',
				description: 'upsert parameter',
				schema: { type: 'boolean' }
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
			},
			security: [
				{
					"bearerAuth": []
				}
			]
		},
		'delete': {
			description: `Delete an existing '${config.name}'`,
			operationId: `${methodName.destroy}`,
			parameters: [{
				name: 'id',
				in: 'path',
				required: true,
				description: `Id of the '${config.name}' to be deleted`,
				schema: { type: 'string' }
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
			},
			security: [
				{
					"bearerAuth": []
				}
			]
		}
	};

	if (mathDefinition) {
		swagger.paths['/{id}/math'] = {
			'x-swagger-router-controller': `${methodName.controller}`,
			'put': {
				description: `Does math operation on a '${config.name}'`,
				operationId: `${methodName.math}`,
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
					required: true,
					description: `Id of the '${config.name}' to be updated`,
					schema: { type: 'string' }
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
				},
				security: [
					{
						"bearerAuth": []
					}
				]
			}
		};
	}

	swagger.paths['/utils/aggregate'] = {
		'x-swagger-router-controller': `${methodName.controller}`,
		'post': {
			description: 'runs aggregate query',
			operationId: 'v1_aggregate',
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
			},
			security: [
				{
					"bearerAuth": []
				}
			]
		}
	};

	swagger.paths['/utils/bulkDelete'] = {
		'x-swagger-router-controller': `${methodName.controller}`,
		'delete': {
			description: `Deletes a list of '${name}'`,
			operationId: `${methodName.bulkDelete}`,
			parameters: [{
				name: 'ids',
				in: 'query',
				description: 'List of document IDs to be deleted',
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
			}],
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
			},
			security: [
				{
					"bearerAuth": []
				}
			]
		}
	};

	swagger.paths['/utils/bulkShow'] = {
		'x-swagger-router-controller': `${methodName.controller}`,
		'get': {
			description: `Retrieve a list of '${config.name}'`,
			operationId: `${methodName.bulkShow}`,
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
			},
			security: [
				{
					"bearerAuth": []
				}
			]
		}
	};

    swagger.paths['/utils/bulkUpdate'] = {
        'x-swagger-router-controller': `${methodName.controller}`,
        'put': {
            description: `Bulk update an existing list of '${name}' documents.`,
            operationId: `${methodName.bulkUpdate}`,
            parameters: [
                {
                    name: 'ids',
                    in: 'query',
                    description: 'Array of document IDs to be updated.',
                    schema: { 
                        type: 'object', 
                        properties: 
                        { 
                            ids: 
                            { 
                                type: 'array', 
                                items: { type: 'string' } 
                            } 
                        } 
                    }
                }
            ],
            requestBody: {
                description: `Payload to update '${name}' documents.`,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object'
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Success. Returns a list of updated entities.'
                },
                '400': {
                    description: 'Bad request. The request parameters are invalid or incomplete.'
                },
                '403': {
                    description: 'Forbidden. You do not have permission to update records.'
                },
                '500': {
                    description: 'Internal server error. An unexpected error occurred during processing.'
                }
            },
            security: [
                {
                    "bearerAuth": []
                }
            ]
        }
    };
    
    swagger.paths['/utils/bulkUpsert'] = {
        'x-swagger-router-controller': `${methodName.controller}`,
        'post': {
            description: `Bulk upsert a list of '${name}' documents.`,
            operationId: `${methodName.bulkUpsert}`,
            parameters: [
                {
                    name: 'update',
                    in: 'query',
                    description: 'Flag indicating whether to update existing documents (true or false).',
                    schema: { type: 'boolean' }
                },
                {
                    name: 'insert',
                    in: 'query',
                    description: 'Flag indicating whether to insert new documents (true or false).',
                    schema: { type: 'boolean' }
                }
            ],
            requestBody: {
                description: `Payload to update/insert '${name}' documents.`,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                keys: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Array of document keys to identify the documents to update/insert.'
                                },
                                docs: {
                                    type: 'array',
                                    items: { type: 'object' },
                                    description: 'Array of documents to be updated/inserted.'
                                }
                            },
                            required: ['keys', 'docs']
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Success. Returns a list of updated or inserted entities.'
                },
                '400': {
                    description: 'Bad request. The request parameters are invalid or incomplete.'
                },
                '403': {
                    description: 'Forbidden. The user does not have permission for this operation.'
                },
                '500': {
                    description: 'Internal server error. An unexpected error occurred during processing.'
                }
            },
            security: [
                {
                    "bearerAuth": []
                }
            ]
        }
    };
    
	swagger.paths['/utils/count'] = {
		'x-swagger-router-controller': `${methodName.controller}`,
		'get': {
			description: `returns count of '${config.name}'`,
			operationId: `${methodName.count}`,
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
			},
			security: [
				{
					"bearerAuth": []
				}
			]
		}
	};

	swagger.paths['/utils/experienceHook'] = {
		'x-swagger-router-controller': `${methodName.controller}`,
		'post': {
			description: 'triggers the hook with data',
			operationId: `${methodName.experienceHook}`,
			requestBody: {
				description: 'data',
				content: {
					'application/json': {
						schema: {
							type: 'object'
						}
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
		'x-swagger-router-controller': `${methodName.controller}`,
		'post': {
			description: `Retrieve a list of '${config.name}'`,
			operationId: `${methodName.exportAll}`,
			requestBody: {
				content: {
					'application/json': {
						schema: {
							properties: {
								filter: {
									type: 'string',
									description: 'Filter records based on certain fields'
								},
								select: {
									type: 'string',
									description: 'Comma seperated fields to be displayed'
								},
								sort: {
									type: 'string',
									description: 'sort parameter'
								},
								skip: {
									type: 'integer',
									description: 'Number of records to skip'
								},
								batchSize: {
									type: 'integer',
									description: 'Batch size for cursor'
								},
							}
						}
					}
				}
			},
			parameters: config.enableSearchIndex ? [expandOption, searchOption, totalRecord] : [expandOption, totalRecord],
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
		'x-swagger-router-controller': `${methodName.controller}`,
		'get': {
			description: 'Download the file',
			parameters: [{
				name: 'id',
				in: 'path',
				required: true,
				description: 'Id of file',
				schema: { type: 'string' }
			}, {
				name: 'filename',
				in: 'query',
				description: 'filename of file',
				schema: { type: 'string' }
			}],
			operationId: `${methodName.exportFileileDownload}`,
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

	swagger.paths['/utils/file/download/{id}'] = {
		'x-swagger-router-controller': `${methodName.controller}`,
		'get': {
			description: 'Download the file',
			parameters: [
				{
					name: 'id',
					in: 'path',
					required: true,
					description: 'Id of file',
					schema: { type: 'string' }
				},
				{
					name: 'encryptionKey',
					in: 'query',
					required: false,
					description: 'Encryption Key to download decrypted file',
					schema: { type: 'string' }
				}
			],
			operationId: `${methodName.fileDownload}`,
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

	swagger.paths['/utils/file/upload'] = {
		'x-swagger-router-controller': `${methodName.controller}`,
		'post': {
			description: 'Uploads the file',
			operationId: `${methodName.fileUpload}`,
			parameters: [
				{
					name: 'encryptionKey',
					in: 'query',
					required: false,
					description: 'Encryption Key to encrypt file',
					schema: { type: 'string' }
				}
			],
			responses: {
				'200': {
					description: 'meta data of file'
				},
				'400': {
					description: 'Bad parameters'
				},
				'500': {
					description: 'Internal server error'
				}
			},
			security: [
				{
					"bearerAuth": []
				}
			]
		}
	};

	swagger.paths['/utils/fileMapper/{fileId}/count'] = {
		'x-swagger-router-controller': `${methodName.controller}`,
		'get': {
			description: `returns count of '${config.name}'`,
			operationId: 'fileMapperCount',
			parameters: countParameters.concat({
				name: 'fileId',
				in: 'path',
				required: true,
				description: 'fileId against which we db will be querried',
				schema: { type: 'string' }
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
			},
			security: [
				{
					"bearerAuth": []
				}
			]
		}
	};

	swagger.paths['/utils/fileTransfers'] = {
		'x-swagger-router-controller': `${methodName.controller}`,
		'get': {
			description: 'Retrieve list of bulk actions\'',
			operationId: `${methodName.exportAllDetail}`,
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
			},
			security: [
				{
					"bearerAuth": []
				}
			]
		}
	};

	swagger.paths['/utils/fileTransfers/{id}'] = {
		'x-swagger-router-controller': `${methodName.controller}`,
		'delete': {
			description: 'Deletes a file with file id',
			operationId: `${methodName.exportAllDetailDelete}`,
			parameters: [{
				name: 'id',
				in: 'path',
				required: true,
				description: 'Id of file',
				schema: { type: 'string' }
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
			},
			security: [
				{
					"bearerAuth": []
				}
			]
		}
	};

	swagger.paths['/utils/fileTransfers/count'] = {
		'x-swagger-router-controller': `${methodName.controller}`,
		'get': {
			description: 'count of bulk actions\'',
			operationId: `${methodName.exportAllDetailCount}`,
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
			},
			security: [
				{
					"bearerAuth": []
				}
			]
		}
	};

	swagger.paths['/utils/fileTransfers/{fileId}/readStatus'] = {
		'x-swagger-router-controller': `${methodName.controller}`,
		'put': {
			description: 'Updates File Read Status',
			operationId: 'exportUpdateReadStatus',
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
				required: true,
				description: 'Id of file',
				schema: { type: 'string' }
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
			},
			security: [
				{
					"bearerAuth": []
				}
			]
		}
	};

	swagger.paths['/utils/hook'] = {
		'x-swagger-router-controller': `${methodName.controller}`,
		'post': {
			description: 'triggers the hook with data',
			operationId: `${methodName.hook}`,
			requestBody: {
				description: 'data',
				content: {
					'application/json': {
						schema: {
							type: 'object'
						}
					}
				}

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
		'x-swagger-router-controller': `${methodName.controller}`,
		'get': {
			description: `Retrieve a list of secured fields in '${config.name}'`,
			operationId: `${methodName.securedFields}`,
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
		'x-swagger-router-controller': `${methodName.controller}`,
		'post': {
			description: `validate '${config.name}'`,
			operationId: `${methodName.simulate}`,
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
				name: 'generateId',
				in: 'query',
				description: 'Generate Id for the document',
				schema: {
					type: 'boolean',
					default: false
				},
			},
			{
				name: 'operation',
				in: 'query',
				description: 'request method',
				schema: {
					type: 'string',
					default: false
				},
			},
			{
				name: 'docId',
				in: 'query',
				description: 'request method',
				schema: {
					type: 'string',
					default: false
				},
			},
			{
				name: 'select',
				in: 'query',
				description: 'select in case of get',
				schema: {
					type: 'string',
					default: false
				}
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
			},
			security: [
				{
					"bearerAuth": []
				}
			]
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
	// 				$ref: '#/definitions/bulkCreateData'
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
	// 				$ref: '#/definitions/enrichData'
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

	// swagger.paths['/internal/health/live'] = {
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

	// swagger.paths['/internal/health/ready'] = {
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