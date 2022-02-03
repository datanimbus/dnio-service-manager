const mongoose = require('mongoose');
const Schema = mongoose.Schema;
let envConfig = require('../../config/config');
var definition = {
	'_id': {
		'type': 'String',
		'default': null
	},
	'name': {
		'type': 'String',
		'required': true
	},
	'description': {
		'type': 'String'
	},
	'collectionName': {
		'type': 'String'
	},
	'app': {
		'type': 'String',
		'required': true
	},
	'api': {
		'type': 'String',
		'required': true
	},
	'port': {
		'type': 'Number',
		'required': true
	},
	'headers': {
		'type': 'Object'
	},
	'allowedFileTypes': {
		'type': ['String']
	},
	'schemaFree': {
		'type': 'Boolean',
		'default': false
	},
	'wizard': {
		'type': [{
			'name': 'String',
			'fields': {
				'type': ['String']
			},
			'actions': {
				'type': [{
					'name': {
						'type': 'String'
					},
					'url': {
						'type': 'String'
					},
					'label': {
						'type': 'String'
					},
					'type': {
						'type': 'String'
					},
					'errorMessage': {
						'type': 'String'
					},
					'button': {
						'name': {
							'type': 'String'
						},
						'type': {
							'type': 'String'
						},
						'color': {
							'type': 'String'
						}
					}
				}]
			}
		}]
	},
	'version': {
		'type': 'Number',
		'default': 1
	},
	'instances': {
		'type': 'Number',
		'default': 1
	},
	'versionValidity': {
		'type': {
			'validityValue': Schema.Types.Mixed,
			'validityType': {
				'type': 'String',
				'enum': ['count', 'time']
			}
		},
		'default': {
			'validityValue': -1,
			'validityType': 'count'
		}
	},
	'permanentDeleteData': {
		'type': 'Boolean',
		'default': true
	},
	'disableInsights': {
		'type': 'Boolean',
		'default': false
	},
	'definition': {
		'type': [{
			'key': {
				'type': 'String',
				'required': true
			},
			'type': {
				'type': 'String',
				'required': true
			},
			'prefix': {
				'type': 'String',
				'required': false
			},
			'suffix': {
				'type': 'String',
				'required': false
			},
			'padding': {
				'type': 'Number',
				'required': false
			},
			'counter': {
				'type': 'Number',
				'required': false
			},
			'definition': {
				'type': 'Object',
				'required': false
			},
			'properties': {
				'type': 'Object'
			}
		}],
		'default': undefined
	},
	// 'attributeList': [{
	// 	'key': 'String',
	// 	'name': 'String',
	// 	'properties': {
	// 		'type': 'Object'
	// 	}
	// }],
	'status': {
		'type': 'String',
		'enum': ['Pending', 'Active', 'Undeployed', 'Maintenance', 'Draft'],
		'default': 'Draft'
	},
	'comment': {
		'type': 'String'
	},
	'maintenanceInfo': {
		'type': 'String'
	},
	'enableSearchIndex': {
		'type': 'Boolean',
		'default': envConfig.enableSearchIndex
	},
	'relatedSchemas': {
		'type': {
			'incoming': [{
				'type': {
					'service': {
						'type': 'String'
					},
					'uri': {
						'type': 'String'
					},
					'port': {
						'type': 'Number'
					},
					'app': {
						'type': 'String'
					},
					'isRequired': {
						'type': 'Boolean'
					}
				}
			}],
			'outgoing': [{
				'type': {
					'service': {
						'type': 'String'
					},
					'path': {
						'type': 'String'
					}
				}
			}],
			'internal': {
				'users': [{
					'type': {
						'isRequired': {
							'type': 'Boolean'
						},
						'path': {
							'type': 'String'
						},
						'uri': {
							'type': 'String'
						}
					}
				}]
			}
		}
	},
	'webHooks': {
		'type': [{
			'name': {
				'type': 'String'
			},
			'url': {
				'type': 'String'
			},
			'failMessage': {
				'type': 'String'
			},
			'type': {
				'type': 'String'
			},
			'refId': {
				'type': 'String'
			}
		}]
	},
	'preHooks': {
		'type': [{
			'name': {
				'type': 'String'
			},
			'url': {
				'type': 'String'
			},
			'failMessage': {
				'type': 'String'
			},
			'type': {
				'type': 'String'
			},
			'refId': {
				'type': 'String'
			}
		}]
	},
	'workflowHooks': {
		'postHooks': {
			'submit': {
				'type': [{
					'name': {
						'type': 'String'
					},
					'url': {
						'type': 'String'
					},
					'type': {
						'type': 'String'
					},
					'refId': {
						'type': 'String'
					}
				}]
			},
			'discard': {
				'type': [{
					'name': {
						'type': 'String'
					},
					'url': {
						'type': 'String'
					},
					'type': {
						'type': 'String'
					},
					'refId': {
						'type': 'String'
					}
				}]
			},
			'approve': {
				'type': [{
					'name': {
						'type': 'String'
					},
					'url': {
						'type': 'String'
					},
					'type': {
						'type': 'String'
					},
					'refId': {
						'type': 'String'
					}
				}]
			},
			'rework': {
				'type': [{
					'name': {
						'type': 'String'
					},
					'url': {
						'type': 'String'
					},
					'type': {
						'type': 'String'
					},
					'refId': {
						'type': 'String'
					}
				}]
			},
			'reject': {
				'type': [{
					'name': {
						'type': 'String'
					},
					'url': {
						'type': 'String'
					},
					'type': {
						'type': 'String'
					},
					'refId': {
						'type': 'String'
					}
				}]
			}
		}
	},
	'stateModel': {
		'type': {
			'attribute': { 'type': 'String' },
			'initialStates': [{ 'type': 'String' }],
			'states': { 'type': 'Object' },
			'enabled': { 'type': 'Boolean' }
		}
	},
	'workflowConfig': {
		'type': {
			'enabled': { 'type': 'Boolean' },
			'makerCheckers': {
				'type': [
					{
						'name': { 'type': 'String' },
						'steps': {
							'type': [
								{
									'id': { 'type': 'String' },
									'name': { 'type': 'String' },
									'approvals': { 'type': 'Number' }
								}
							]
						}
					}
				]
			}
		}
	},
	'flags': {
		'type': {
			'apiEndpointChanged': {
				'type': 'String',
				'default': true
			}
		}
	},
	'tags': {
		'type': 'Object'
	},
	'attributeCount': {
		'type': 'Number',
		'default': 0
	},
	'draftVersion': {
		'type': 'Number'
	},
	'role': {
		'type': 'Object'
	},
	'_metadata': {
		'type': {
			'version': {
				'release': { 'type': 'Number' }
			},
			'lastUpdatedBy': { 'type': 'String' }
		}
	},
	'type': {
		'type': 'String',
		'required': false,
		'default': null
	},
};
module.exports.definition = definition;