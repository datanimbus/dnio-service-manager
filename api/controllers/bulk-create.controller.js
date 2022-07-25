'use strict';

const mongoose = require('mongoose');
const SMCrud = require('@appveen/swagger-mongoose-crud');
const cuti = require('@appveen/utils');

const definition = {
    _id: {
        type: 'Object'
    },
    data: {
        type: 'Object'
    },
    app: {
        type: 'String'
    },
    serviceId: {
        type: 'String'
    },
    status: {
        type: 'String'
    }
};

const schema = new mongoose.Schema(definition);
const logger = global.logger;

const options = {
    logger: logger,
    collectionName: 'services.imports'
};

schema.pre('save', cuti.counter.getIdGenerator('BULK', 'services.imports', null, null, 1000));

const crudder = new SMCrud(schema, 'service-imports', options);


const notificationDefinition = {
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
    }
};

const notificationSchema = new mongoose.Schema(notificationDefinition);

const notificationOptions = {
    logger: logger,
    collectionName: 'services.fileTransfers'
};

const notificationCrudder = new SMCrud(notificationSchema, 'service-transfers', notificationOptions);



module.exports = {
    show: crudder.show,
    index: crudder.index,
    count: crudder.count,
    notificationShow: notificationCrudder.show,
    notificationIndex: notificationCrudder.index,
    notificationCount: notificationCrudder.count,
};