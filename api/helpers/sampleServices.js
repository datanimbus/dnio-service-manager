let e = [{
	'_id': `SRVC1001`,
	'relatedSchemas': {
		'incoming': [{
			'service': `SRVC1002`,
			'uri': `/abc`,
			'port': 20001
		}],
		'outgoing': []
	}
},
{
	'_id': `SRVC1002`,
	'relatedSchemas': {
		'incoming': [{
			'service': `SRVC1003`,
			'uri': `/abc`,
			'port': 20001
		}],
		'outgoing': [{
			'service': `SRVC1001`,
			'path': `{}`
		}]
	}
},
{
	'_id': `SRVC1003`,
	'relatedSchemas': {
		'incoming': [{
			'service': `SRVC1005`,
			'uri': `/abc`,
			'port': 20001
		}],
		'outgoing': [{
			'service': `SRVC1004`,
			'path': `{}`
		}, {
			'service': `SRVC1002`,
			'path': `{}`
		}]
	}
},
{
	'_id': `SRVC1004`,
	'relatedSchemas': {
		'incoming': [{
			'service': `SRVC1003`,
			'uri': `/abc`,
			'port': 20001
		}],
		'outgoing': []
	}
},
{
	'_id': `SRVC1005`,
	'relatedSchemas': {
		'outgoing': [{
			'service': `SRVC1003`,
			'path': `{}`
		}]
	}
},
{
	'_id': `SRVC1006`,
	'relatedSchemas': {
		'incoming': [{
			'service': `SRVC1007`,
			'uri': `/abc`,
			'port': 20001
		}],
		'outgoing': [{
			'service': `SRVC1003`,
			'path': `{}`
		}, {
			'service': `SRVC1005`,
			'path': `{}`
		}]
	}
},
{
	'_id': `SRVC1007`,
	'relatedSchemas': {
		'outgoing': [{
			'service': `SRVC1007`,
			'path': `{}`
		}]
	}
}

];
module.exports = e;