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
    //obj.math = `v1_${name}Math`;
    obj.destroy = `v1_${name}Destroy`;
    obj.count = `v1_${name}Count`;
    obj.bulkShow = `v1_${name}BulkShow`;
    //obj.securedFields = `v1_${name}SecuredFields`;
    obj.bulkDelete = `v1_${name}BulkDelete`;
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
    let securitySchemes = {};
    var name = _.camelCase(config.name);
    securitySchemes['bearerAuth'] = {
        'type': 'http',
        'scheme': 'bearer',
        'bearerFormat': 'JWT'
    }

    swagger.components.securitySchemes = securitySchemes

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
                            type: 'object'
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
                            type: 'object'

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
            // TODO - requestBody can't be used inside DELETE operation
            // requestBody: {
            // 	description: 'Payload to reset a User',
            // 	content: {
            // 		'application/json': {
            // 			schema: {
            // 				type: 'object',
            // 				properties: {
            // 					ids: {
            // 						type: 'array',
            // 						items: {
            // 							type: 'string'
            // 						}
            // 					}
            // 				}
            // 			}
            // 		}
            // 	}
            // },
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
                                'filter': {
                                    'type': 'string',
                                    'description': 'Filter records based on certain fields'
                                },
                                'select': {
                                    'type': 'string',
                                    'description': 'Comma seperated fields to be displayed'
                                },
                                'sort': {
                                    'type': 'string',
                                    'description': 'sort parameter'
                                },
                                'skip': {
                                    'type': 'integer',
                                    'description': 'Number of records to skip'
                                },
                                'batchSize': {
                                    'type': 'integer',
                                    'description': 'Batch size for cursor'
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
            }, {
                name: 'authorization',
                in: 'header',
                description: 'The JWT token for req.validation',
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
                            type: 'object'
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

    return swagger;
}

module.exports.generateYamlSchemaFree = generateYaml;