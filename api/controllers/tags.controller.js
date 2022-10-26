'use strict';

const mongoose = require('mongoose');
const logger = global.logger;
let e = {};
e.tags = (_req, _res) => {
	let tag = _req.query.tag;
	let regex = tag ? '^' + tag : '';
	mongoose.model('services')
		.aggregate([{
			'$match': {
				'tags': {
					'$regex': regex,
					'$options': 'i'
				}
			}
		},
		{
			'$unwind': '$tags'
		},
		{
			'$match': {
				'tags': {
					'$regex': regex,
					'$options': 'i'
				}
			}
		},
		{
			'$group': {
				'_id': 'TAG1',
				'tags': {
					'$addToSet': '$tags'
				}
			}
		}
		])
		.then(docs => {
			if (docs && docs[0])
				_res.status(200).json(docs[0].tags);
			else {
				_res.status(200).json([]);
			}
		})
		.catch(e => {
			logger.error(e.message);
			if(!_res.headersSent)
				_res.status(500).json({message: e.message});
		});
};
module.exports = e;