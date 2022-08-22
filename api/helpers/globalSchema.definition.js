var definition = {
	'_id': {
		'type': 'String',
		'default': null
	},
	'description': {
		'type': 'String'
	},
	'name': {
		'type': 'String',
		'required': true
	},
	'definition': {
		'type': [
			{
				'type': 'Object',
				default: function () {
					return {
						type: 'Object',
						definition: []
					}
				}
				// 'definition': [
				// 	{
				// 		'key': 'String',
				// 		'type': 'String',
				// 		'definition': {
				// 			'type': 'Object',
				// 			'required': false
				// 		},
				// 		'properties': {
				// 			'type': 'Object'
				// 		}
				// 	}
				// ]
			}
		]
	},
	'services': {
		'type': ['String']
	},
	'app': {
		'type': 'String'
	},
	// 'attributeList': [{
	// 	'key': 'String',
	// 	'name': 'String',
	// 	'properties': {
	// 		'type': 'Object'
	// 	}
	// }],
	'_metadata': {
		'type': {
			'version': {
				'release': { 'type': 'String' }
			}
		}
	}
};
module.exports.definition = definition;