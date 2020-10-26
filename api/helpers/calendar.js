var e = {};

e.getCalendarDSDefinition = (dsDetails) => {
	return {
		'app': dsDetails.app,
		'api': dsDetails.api,
		'port': dsDetails.port,
		'version': 1,
		'instances': 1,
		'permanentDeleteData': true,
		'disableInsights': false,
		'status': `Pending`, // Assuming deploy is the next step
		'enableSearchIndex': false,
		'type': `internal`,
		'attributeCount': 4,
		'name': dsDetails.name,
		'description': `Calendar Data Service for Time Bound Settings`,
		'wizard': [],
		// 'attributeList': [{
		// 	'key': `_id`,
		// 	'name': `ID`
		// }, {
		// 	'key': `name`,
		// 	'name': `Name`,
		// 	'properties': {
		// 		'_type': `String`,
		// 		'label': null,
		// 		'readonly': false,
		// 		'errorMessage': null,
		// 		'name': `Name`,
		// 		'required': true,
		// 		'fieldLength': 0,
		// 		'_description': null,
		// 		'_typeChanged': `String`,
		// 		'_isParrentArray': null,
		// 		'_isGrpParentArray': null,
		// 		'_detailedType': `enum`,
		// 		'default': null,
		// 		'createOnly': false,
		// 		'unique': false,
		// 		'_listInput': null,
		// 		'minlength': null,
		// 		'maxlength': null,
		// 		'pattern': null,
		// 		'email': false,
		// 		'password': false,
		// 		'longText': false,
		// 		'richText': false,
		// 		'enum': [`Default`],
		// 		'hasTokens': []
		// 	}
		// }, {
		// 	'key': `holidayName`,
		// 	'name': `Holiday Name`,
		// 	'properties': {
		// 		'_type': `String`,
		// 		'label': null,
		// 		'readonly': false,
		// 		'errorMessage': null,
		// 		'name': `Holiday Name`,
		// 		'required': false,
		// 		'fieldLength': 0,
		// 		'_description': null,
		// 		'_typeChanged': `String`,
		// 		'_isParrentArray': null,
		// 		'_isGrpParentArray': null,
		// 		'_detailedType': ``,
		// 		'default': null,
		// 		'createOnly': false,
		// 		'unique': false,
		// 		'_listInput': null,
		// 		'enum': [],
		// 		'minlength': null,
		// 		'maxlength': null,
		// 		'pattern': null,
		// 		'email': false,
		// 		'password': false,
		// 		'longText': false,
		// 		'richText': false,
		// 		'hasTokens': []
		// 	}
		// }, {
		// 	'key': `date`,
		// 	'name': `Date`,
		// 	'properties': {
		// 		'name': `Date`,
		// 		'_type': `Date`,
		// 		'label': null,
		// 		'readonly': false,
		// 		'errorMessage': null,
		// 		'required': true,
		// 		'fieldLength': 0,
		// 		'_description': null,
		// 		'_typeChanged': `Date`,
		// 		'_isParrentArray': null,
		// 		'_isGrpParentArray': null,
		// 		'_detailedType': ``,
		// 		'default': null,
		// 		'createOnly': false,
		// 		'dateType': `date`
		// 	}
		// }],
		'webHooks': [],
		'preHooks': [],
		'collectionName': `adamCalendar`,
		'__v': 2,
		'definition': `[{"key":"_id","prefix":"CAL","suffix":null,"padding":null,"counter":1001,"properties":{"label":null,"readonly":false,"errorMessage":null,"name":"ID","required":false,"fieldLength":0,"_description":null,"_typeChanged":null,"_isParrentArray":null,"_isGrpParentArray":null,"_detailedType":"","dataKey":"_id","dataPath":"_id"}},{"key":"name","type":"String","properties":{"name":"Name","label":null,"required":true,"fieldLength":0,"_typeChanged":"String","enum":["Default"],"dataKey":"name","dataPath":"name"}},{"key":"holidayName","type":"String","properties":{"name":"Holiday Name","fieldLength":0,"_typeChanged":"String","dataKey":"holidayName","dataPath":"holidayName"}},{"key":"date","type":"Date","properties":{"name":"Date","label":null,"required":true,"fieldLength":0,"_typeChanged":"Date","dateType":"date","dataKey":"date","dataPath":"date"}}]`,
		'headers': [],
		'relatedSchemas': {
			'internal': {
				'users': []
			},
			'outgoing': []
		},
		'role': null,
		'versionValidity': {
			'validityType': `count`,
			'validityValue': -1
		},
		'workflowHooks': {
			'postHooks': {
				'submit': [],
				'rework': [],
				'discard': [],
				'approve': [],
				'reject': []
			}
		},
	};
};

module.exports = e;