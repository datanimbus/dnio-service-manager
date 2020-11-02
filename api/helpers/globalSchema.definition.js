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
	'definition': [{
		'key': 'String',
		'type': 'String',
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
			'type': 'Object'
		},
		'properties': {
			'type': 'Object'
		}
	}],
	'services': {
		'type': ['String']
	},
	'app': {
		'type': 'String'
	},
	'attributeList': [{
		'key': 'String',
		'name': 'String',
		'properties': {
			'type': 'Object'
		}
	}],
	'_metadata': {
		'type': {
			'version': {
				'release': { 'type': 'Number' }
			}
		}
	}
};
module.exports.definition = definition;