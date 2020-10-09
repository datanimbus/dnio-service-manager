var definition = {
	'_id': {
		'type': `String`,
		'default': null
	},
	'description': {
		'type': `String`
	},
	'name': {
		'type': `String`,
		'required': true
	},
	'definition': {
		'type': `String`,
	},
	'services': {
		'type': [`String`]
	},
	'app': {
		'type': `String`
	},
	'attributeList': [{
		'key': `String`,
		'name': `String`,
		'properties': {
			'type': `Object`
		}
	}],
	'_metadata': {
		'type': {
			'version': {
				'release': { 'type': `Number` }
			}
		}
	}
};
module.exports.definition = definition;