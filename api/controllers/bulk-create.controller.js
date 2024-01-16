'use strict';

const cuti = require('@appveen/utils');
const { SMCrud, MakeSchema } = require('@appveen/swagger-mongoose-crud');

const definition = {
	_id: {
		type: 'String'
	},
	data: {
		type: 'Object'
	},
	fileId: {
		type: 'String'
	},
	app: {
		type: 'String'
	},
	name: {
		type: 'String'
	},
	definition: {
		type: 'Object'
	},
	status: {
		type: 'String'
	},
	error: {
		type: 'String'
	},
	message: {
		type: 'String'
	}
};

const schema = MakeSchema(definition);
const logger = global.logger;

const options = {
	logger: logger,
	collectionName: 'services.imports'
};

schema.index({ app: 1, fileId: 1, status: 1 });
schema.pre('save', cuti.counter.getIdGenerator('BULK', 'services.imports', null, null, 1000));

const crudder = new SMCrud(schema, 'service-imports', options);


const notificationDefinition = {
	_id: {
		type: 'String'
	},
	app: {
		type: 'String'
	},
	fileName: {
		type: 'String'
	},
	status: {
		type: 'String'
	},
	user: {
		type: 'String'
	},
	result: {
		type: 'Object'
	},
	error: {
		type: 'String'
	},
	message: {
		type: 'String'
	}
};

const notificationSchema = MakeSchema(notificationDefinition);

const notificationOptions = {
	logger: logger,
	collectionName: 'services.fileTransfers'
};

notificationSchema.index({ app: 1, user: 1, status: 1 });
notificationSchema.pre('save', cuti.counter.getIdGenerator('IMPORT', 'services.fileTransfers', null, null, 1000));

const notificationCrudder = new SMCrud(notificationSchema, 'service-transfers', notificationOptions);


function customIndex(req, res) {
	try {
		patchFilter(req);
		notificationCrudder.index(req, res);
	} catch (err) {
		logger.error(err);
		res.status(400).json({ message: err.message });
	}
}

function customShow(req, res) {
	try {
		patchFilter(req);
		notificationCrudder.show(req, res);
	} catch (err) {
		logger.error(err);
		res.status(400).json({ message: err.message });
	}
}

function customCount(req, res) {
	try {
		patchFilter(req);
		notificationCrudder.count(req, res);
	} catch (err) {
		logger.error(err);
		res.status(400).json({ message: err.message });
	}
}

function patchFilter(req) {
	try {
		let filter = req.params.filter;
		if (filter) {
			filter = JSON.parse(filter);
			filter.user = req.user._id;
			req.params.filter = JSON.stringify(filter);
		} else {
			req.params.filter = JSON.stringify({ user: req.user._id });
		}
	} catch (err) {
		req.params.filter = JSON.stringify({ user: req.user._id });
		logger.error(err);
	}
}


async function startImport(req, res) {
	try {
		res.status(200).json({ message: 'Import Process Started' });
	} catch (err) {
		logger.error(err);
		res.status(400).json({ message: err.message });
	}
}

async function cleanImport(req, res) {
	try {
		await notificationCrudder.model.deleteOne({ _id: req.params.id, app: req.params.app });
		await crudder.model.deleteMany({ fileId: req.params.id, app: req.params.app });
		res.status(200).json({ message: 'Cleaned' });
	} catch (err) {
		logger.error(err);
		res.status(400).json({ message: err.message });
	}
}


module.exports = {
	show: crudder.show,
	index: crudder.index,
	count: crudder.count,
	notificationShow: customShow,
	notificationIndex: customIndex,
	notificationCount: customCount,
	startImport,
	cleanImport
};
