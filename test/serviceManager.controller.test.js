var assert = require('assert');
var sinon = require('sinon');
require('sinon-mongoose');
var mockExpress = require('sinon-express-mock');
var mongoose = require("mongoose");
const smHooks = require('../api/helpers/serviceManagerHooks');
const deployUtil = require('../api/deploy/deploymentUtil');
const deploymentManager = require('../api/deploy/deploymentManager');
var smcController = null;

var rewire = require("rewire");

describe("Testing serviceManager main", function () {
    this.timeout(5000);
    var promiseResolve = sinon.fake.resolves();
    var promiseRejects = sinon.fake.rejects(new Error("Connection error"));
    var fakeFun = sinon.fake();
    var smcControllerRewire = null;
    describe('Create a data service', function () {
        var ServiceMock = null;
        var GlobalServiceMock = null;
        var Service = null;
        var ServiceDraft = null;
        var GlobalService = null;

        before(() => {
            sinon.stub(mongoose, "connect").callsFake(promiseResolve);
            require("../app");
            smcControllerRewire = rewire("../api/controllers/serviceManager.controller");
            globalSchemaControllerRewire = rewire("../api/controllers/globalSchema.controller");
            // smcController = require("../api/controllers/serviceManager.controller");
        });

        after(() => {
            sinon.restore();
            ServiceMock.restore();
        });

        beforeEach(() => {
            var validateApp = sinon.stub(smHooks, 'validateApp');
            validateApp.returns(Promise.resolve());

            var postRolesUserMgmt = sinon.stub(deployUtil, 'postRolesUserMgmt');
            postRolesUserMgmt.returns(Promise.resolve());

            var createServiceInUserMgmt = sinon.stub(deployUtil, 'createServiceInUserMgmt');
            createServiceInUserMgmt.returns(Promise.resolve());

            var sendToSocket = sinon.stub(deployUtil, 'sendToSocket');
            sendToSocket.returns(Promise.resolve());


            smcControllerRewire.__set__("apiUniqueCheck", (a, b) => Promise.resolve());
            smcControllerRewire.__set__("nameUniqueCheck", (a, b) => Promise.resolve());
            smcControllerRewire.__set__("createWebHooks", () => Promise.resolve());
            Service = mongoose.model('services');
            ServiceMock = sinon.mock(Service);
        });

        afterEach(() => {
            sinon.restore();
            ServiceMock.restore();
        });

        it('e.createDoc with only name, app and description', function (done) {
            let request = {
                body: {
                    name: "test", description: "Test service", app: "Adam"
                },
                app: {
                    get: sinon.fake()
                }
            };
            const req = mockExpress.mockReq(request)
            const res = mockExpress.mockRes()

            const response = {
                status() { return res },
                send() { },
                json() { }
            };
            const statusSpy = sinon.spy(response, 'status');
            // smcControllerRewire = rewire("../api/controllers/serviceManager.controller");

            ServiceMock
                .expects('find').withArgs({}, 'port', { sort: { port: 1 } })
                .resolves(Promise.resolve([20001, 20002]));

            let save = sinon.stub(Service.prototype, 'save');
            save.returns(Promise.resolve({
                workflowHooks:
                    { postHooks: { submit: [], discard: [], approve: [], rework: [], reject: [] } },
                _metadata:
                {
                    version: { document: 0 },
                    deleted: false,
                    lastUpdated: new Date(),
                    createdAt: new Date()
                },
                _id: null,
                version: 1,
                instances: 1,
                permanentDeleteData: true,
                status: 'Draft',
                enableSearchIndex: false,
                attributeCount: 0,
                name: 'test',
                description: null,
                app: 'Adam',
                api: '/test',
                wizard: [],
                attributeList: [],
                webHooks: [],
                preHooks: []
            }));
            smcControllerRewire.create(req, response)
                .then(_d => {
                    assert(statusSpy.withArgs(200).calledOnce);
                    done();
                })
        });
        
    })

    describe('Update a data service', function () {
        var ServiceMock = null;
        var GlobalServiceMock = null;
        var Service = null;
        var ServiceDraft = null;
        var GlobalService = null;

        beforeEach(() => {
            var validateApp = sinon.stub(smHooks, 'validateApp');
            validateApp.returns(Promise.resolve());
            smcControllerRewire.__set__("apiUniqueCheck", (a, b) => Promise.resolve());
            smcControllerRewire.__set__("nameUniqueCheck", (a, b) => Promise.resolve());
            smcControllerRewire.__set__("validateCounterChange", () => Promise.resolve());
            smcControllerRewire.__set__("renameCollections", () => Promise.resolve());
            Service = mongoose.model('services');
            ServiceMock = sinon.mock(Service);
            GlobalService = mongoose.model('globalSchema');
            GlobalServiceMock = sinon.mock(GlobalService);
            ServiceDraft = mongoose.model('services.draft');
            ServiceDraftMock = sinon.mock(ServiceDraft);
        });
        afterEach(() => {
            sinon.restore();
            ServiceMock.restore();
            GlobalServiceMock.restore();
        });

        it('e.updateDoc on Draft Data service. This should update the same document', function (done) {
            // smcControllerRewire = rewire("../api/controllers/serviceManager.controller");
            let id = 'SRVC1001';
            let request = {
                swagger: { params: { id: { value: id } } },
                body: {
                    name: 'test',
                    api: '/test',
                    permanentDeleteData: true,
                    app: 'Adam',
                    definition:
                    {
                        _id:
                        {
                            prefix: 'TES',
                            suffix: null,
                            padding: null,
                            counter: 1001,
                            properties: [Object]
                        },
                        ss: { type: 'String', properties: [Object] },
                        ww: { type: 'String', properties: [Object] },
                        ee: { type: 'String', properties: [Object] }
                    },
                    enableSearchIndex: false,
                }
            };
            const req = mockExpress.mockReq(request);
            const res = mockExpress.mockRes();
            const response = {
                status() { return res },
                send() { },
                json() { }
            };
            const statusSpy = sinon.spy(response, 'status');
            let dbsServiceData = { "_id": id, "workflowHooks": { "postHooks": { "submit": [], "rework": [], "discard": [], "approve": [], "reject": [] } }, "_metadata": { "version": { "document": 8, "release": null }, "deleted": false, "lastUpdated": "2019-08-16T06:38:37.319Z", "createdAt": "2019-08-16T05:57:33.212Z" }, "version": 3, "instances": 1, "permanentDeleteData": true, "status": "Draft", "enableSearchIndex": false, "attributeCount": 3, "name": "testRole2", "description": null, "app": "Adam", "api": "/testRole2", "port": 20015, "wizard": [], "attributeList": [{ "_id": "5d564f5e1d7aee40d842d38c", "key": "_id", "name": "ID" }, { "_id": "5d564f5e1d7aee40d842d38b", "key": "ss", "name": "ss", "properties": { "_type": "String", "name": "ss", "required": false, "fieldLength": 0, "_description": null, "_typeChanged": "String", "_detailedType": "", "default": null, "createOnly": false, "unique": false, "_listInput": null, "enum": [], "minlength": null, "maxlength": null, "pattern": null, "email": false, "password": false, "longText": false, "richText": false, "hasTokens": [] } }, { "_id": "5d564f5e1d7aee40d842d38a", "key": "ww", "name": "ww", "properties": { "_type": "String", "name": "ww", "required": false, "fieldLength": 0, "_description": null, "_typeChanged": "String", "_detailedType": "", "default": null, "createOnly": false, "unique": false, "_listInput": null, "enum": [], "minlength": null, "maxlength": null, "pattern": null, "email": false, "password": false, "longText": false, "richText": false, "hasTokens": [] } }], "webHooks": [], "preHooks": [], "collectionName": "testRole2", "__v": 3, "definition": "{\"_id\":{\"prefix\":\"TES\",\"suffix\":null,\"padding\":null,\"counter\":1001,\"properties\":{\"name\":\"ID\",\"dataKey\":\"_id\",\"dataPath\":\"_id\"}},\"ss\":{\"type\":\"String\",\"properties\":{\"name\":\"ss\",\"fieldLength\":0,\"_typeChanged\":\"String\",\"dataKey\":\"ss\",\"dataPath\":\"ss\"}},\"ww\":{\"type\":\"String\",\"properties\":{\"name\":\"ww\",\"fieldLength\":0,\"_typeChanged\":\"String\",\"dataKey\":\"ww\",\"dataPath\":\"ww\"}}}", "headers": [], "relatedSchemas": { "outgoing": [] }, "role": { "roles": [{ "_id": "5d564eae4501037d628add2a", "skipReviewRole": true, "id": "P8450281836", "name": "Skip Review testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add2f", "method": "SKIP_REVIEW" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2e", "method": "POST" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2d", "method": "PUT" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2c", "method": "DELETE" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2b", "method": "GET" }], "description": "This role entitles an authorized user to create, update or delete a record and without any approval" }, { "_id": "5d564eae4501037d628add25", "manageRole": true, "id": "P7105626488", "name": "Manage testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add29", "method": "POST" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add28", "method": "PUT" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add27", "method": "DELETE" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add26", "method": "GET" }], "description": "This role entitles an authorized user to create, update or delete a record" }, { "_id": "5d564eae4501037d628add23", "viewRole": true, "id": "P5387634253", "name": "View testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add24", "method": "GET" }], "description": "This role entitles an authorized user to view the record" }, { "id": "P5143001653", "name": "testnew", "operations": [{ "method": "GET" }] }], "type": "appcenter", "fields": { "_id": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } }, "ss": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } }, "ww": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } } } }, "versionValidity": { "validityType": "count", "validityValue": -1 }, "draftVersion": null }

            ServiceMock
                .expects('findOne')
                .withArgs({ _id: id, '_metadata.deleted': false })
                .returns(Promise.resolve(new Service(dbsServiceData)))

            ServiceMock
                .expects('find')
                .withArgs({ _id: { $in: [] } })
                .returns(Promise.resolve([]))


            GlobalServiceMock
                .expects('find')
                .withArgs({ app: "Adam" }, { _id: 1, name: 1 })
                .resolves(Promise.resolve([])).twice();

            GlobalServiceMock
                .expects('find')
                .withArgs({ app: "Adam", definition: { $exists: true } }, 'name definition')
                .resolves(Promise.resolve([])).twice();

            GlobalServiceMock
                .expects('find')
                .withArgs({ services: "SRVC1001" })
                .resolves(Promise.resolve([])).once();

            let save = sinon.stub(Service.prototype, 'save');
            save.returns(Promise.resolve(dbsServiceData));

            let draftSave = sinon.stub(ServiceDraft.prototype, 'save');
            draftSave.returns(Promise.resolve(dbsServiceData));

            let gssave = sinon.stub(GlobalService.prototype, 'save');
            gssave.returns(Promise.resolve({}));

            smcControllerRewire.update(req, response)
                .then(_d => {
                    assert(statusSpy.withArgs(200).calledOnce);
                    done();
                })
        });

        it('e.updateDoc on Active Data service and draft version null. This should create new draft in services.draft', function (done) {
            // smcControllerRewire = rewire("../api/controllers/serviceManager.controller");
            let id = 'SRVC1001';
            let request = {
                swagger: { params: { id: { value: id } } },
                body: {
                    name: 'test',
                    api: '/test',
                    permanentDeleteData: true,
                    app: 'Adam',
                    definition: { "_id": { "prefix": "TES", "suffix": null, "padding": null, "counter": 1001, "properties": { "name": "ID", "dataKey": "_id", "dataPath": "_id" } }, "ss": { "type": "String", "properties": { "name": "ss", "fieldLength": 0, "_typeChanged": "String", "dataKey": "ss", "dataPath": "ss" } }, "ww": { "type": "String", "properties": { "name": "ww", "fieldLength": 0, "_typeChanged": "String", "dataKey": "ww", "dataPath": "ww" } } },
                    enableSearchIndex: false,
                }
            };
            const req = mockExpress.mockReq(request);
            const res = mockExpress.mockRes();

            const response = {
                status() { return res },
                send() { },
                json() { }
            };
            const statusSpy = sinon.spy(response, 'status');

            let dbsServiceData = { "_id": id, "workflowHooks": { "postHooks": { "submit": [], "rework": [], "discard": [], "approve": [], "reject": [] } }, "_metadata": { "version": { "document": 8, "release": null }, "deleted": false, "lastUpdated": "2019-08-16T06:38:37.319Z", "createdAt": "2019-08-16T05:57:33.212Z" }, "version": 3, "instances": 1, "permanentDeleteData": true, "status": "Active", "enableSearchIndex": false, "attributeCount": 3, "name": "test", "description": null, "app": "Adam", "api": "/test", "port": 20015, "wizard": [], "attributeList": [{ "_id": "5d564f5e1d7aee40d842d38c", "key": "_id", "name": "ID" }, { "_id": "5d564f5e1d7aee40d842d38b", "key": "ss", "name": "ss", "properties": { "_type": "String", "name": "ss", "required": false, "fieldLength": 0, "_description": null, "_typeChanged": "String", "_detailedType": "", "default": null, "createOnly": false, "unique": false, "_listInput": null, "enum": [], "minlength": null, "maxlength": null, "pattern": null, "email": false, "password": false, "longText": false, "richText": false, "hasTokens": [] } }, { "_id": "5d564f5e1d7aee40d842d38a", "key": "ww", "name": "ww", "properties": { "_type": "String", "name": "ww", "required": false, "fieldLength": 0, "_description": null, "_typeChanged": "String", "_detailedType": "", "default": null, "createOnly": false, "unique": false, "_listInput": null, "enum": [], "minlength": null, "maxlength": null, "pattern": null, "email": false, "password": false, "longText": false, "richText": false, "hasTokens": [] } }], "webHooks": [], "preHooks": [], "collectionName": "testRole2", "__v": 3, "definition": "{\"_id\":{\"prefix\":\"TES\",\"suffix\":null,\"padding\":null,\"counter\":1001,\"properties\":{\"name\":\"ID\",\"dataKey\":\"_id\",\"dataPath\":\"_id\"}},\"ss\":{\"type\":\"String\",\"properties\":{\"name\":\"ss\",\"fieldLength\":0,\"_typeChanged\":\"String\",\"dataKey\":\"ss\",\"dataPath\":\"ss\"}},\"ww\":{\"type\":\"String\",\"properties\":{\"name\":\"ww\",\"fieldLength\":0,\"_typeChanged\":\"String\",\"dataKey\":\"ww\",\"dataPath\":\"ww\"}}}", "headers": [], "relatedSchemas": { "outgoing": [] }, "role": { "roles": [{ "_id": "5d564eae4501037d628add2a", "skipReviewRole": true, "id": "P8450281836", "name": "Skip Review testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add2f", "method": "SKIP_REVIEW" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2e", "method": "POST" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2d", "method": "PUT" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2c", "method": "DELETE" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2b", "method": "GET" }], "description": "This role entitles an authorized user to create, update or delete a record and without any approval" }, { "_id": "5d564eae4501037d628add25", "manageRole": true, "id": "P7105626488", "name": "Manage testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add29", "method": "POST" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add28", "method": "PUT" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add27", "method": "DELETE" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add26", "method": "GET" }], "description": "This role entitles an authorized user to create, update or delete a record" }, { "_id": "5d564eae4501037d628add23", "q": true, "id": "P5387634253", "name": "View testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add24", "method": "GET" }], "description": "This role entitles an authorized user to view the record" }, { "id": "P5143001653", "name": "testnew", "operations": [{ "method": "GET" }] }], "type": "appcenter", "fields": { "_id": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } }, "ss": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } }, "ww": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } } } }, "versionValidity": { "validityType": "count", "validityValue": -1 }, "draftVersion": null };

            ServiceMock
                .expects('findOne')
                .withArgs({ _id: id, '_metadata.deleted': false })
                .returns(Promise.resolve(new Service(dbsServiceData)))

            ServiceMock
                .expects('find')
                .withArgs({ _id: { '$in': [] } })
                .returns(Promise.resolve([]));

            GlobalServiceMock
                .expects('find')
                .resolves(Promise.resolve([]));

            let save = sinon.stub(Service.prototype, 'save');
            save.returns(Promise.resolve(dbsServiceData));

            let draftSave = sinon.stub(ServiceDraft.prototype, 'save');
            draftSave.returns(Promise.resolve(dbsServiceData));

            let gssave = sinon.stub(GlobalService.prototype, 'save');
            gssave.returns(Promise.resolve({}));

            smcControllerRewire.update(req, response)
                .then(_d => {
                    assert(statusSpy.withArgs(200).calledOnce);
                    done();
                })
        });

        it('e.updateDoc on Active Data service and draft version exist. This should update draft in services.draft', function (done) {
            // smcControllerRewire = rewire("../api/controllers/serviceManager.controller");
            let id = 'SRVC1001';
            let request = {
                swagger: { params: { id: { value: id } } },
                body: {
                    name: 'test',
                    api: '/test',
                    permanentDeleteData: true,
                    app: 'Adam',
                    definition: { "_id": { "prefix": "TES", "suffix": null, "padding": null, "counter": 1001, "properties": { "name": "ID", "dataKey": "_id", "dataPath": "_id" } }, "ss": { "type": "String", "properties": { "name": "ss", "fieldLength": 0, "_typeChanged": "String", "dataKey": "ss", "dataPath": "ss" } }, "ww": { "type": "String", "properties": { "name": "ww", "fieldLength": 0, "_typeChanged": "String", "dataKey": "ww", "dataPath": "ww" } } },
                    enableSearchIndex: false,
                }
            };
            const req = mockExpress.mockReq(request);
            const res = mockExpress.mockRes();

            const response = {
                status() { return res },
                send() { },
                json() { }
            };
            const statusSpy = sinon.spy(response, 'status');

            let dbsServiceData = { "_id": id, "workflowHooks": { "postHooks": { "submit": [], "rework": [], "discard": [], "approve": [], "reject": [] } }, "_metadata": { "version": { "document": 8, "release": null }, "deleted": false, "lastUpdated": "2019-08-16T06:38:37.319Z", "createdAt": "2019-08-16T05:57:33.212Z" }, "version": 3, "instances": 1, "permanentDeleteData": true, "status": "Active", "enableSearchIndex": false, "attributeCount": 3, "name": "test", "description": null, "app": "Adam", "api": "/test", "port": 20015, "wizard": [], "attributeList": [{ "_id": "5d564f5e1d7aee40d842d38c", "key": "_id", "name": "ID" }, { "_id": "5d564f5e1d7aee40d842d38b", "key": "ss", "name": "ss", "properties": { "_type": "String", "name": "ss", "required": false, "fieldLength": 0, "_description": null, "_typeChanged": "String", "_detailedType": "", "default": null, "createOnly": false, "unique": false, "_listInput": null, "enum": [], "minlength": null, "maxlength": null, "pattern": null, "email": false, "password": false, "longText": false, "richText": false, "hasTokens": [] } }, { "_id": "5d564f5e1d7aee40d842d38a", "key": "ww", "name": "ww", "properties": { "_type": "String", "name": "ww", "required": false, "fieldLength": 0, "_description": null, "_typeChanged": "String", "_detailedType": "", "default": null, "createOnly": false, "unique": false, "_listInput": null, "enum": [], "minlength": null, "maxlength": null, "pattern": null, "email": false, "password": false, "longText": false, "richText": false, "hasTokens": [] } }], "webHooks": [], "preHooks": [], "collectionName": "testRole2", "__v": 3, "definition": "{\"_id\":{\"prefix\":\"TES\",\"suffix\":null,\"padding\":null,\"counter\":1001,\"properties\":{\"name\":\"ID\",\"dataKey\":\"_id\",\"dataPath\":\"_id\"}},\"ss\":{\"type\":\"String\",\"properties\":{\"name\":\"ss\",\"fieldLength\":0,\"_typeChanged\":\"String\",\"dataKey\":\"ss\",\"dataPath\":\"ss\"}},\"ww\":{\"type\":\"String\",\"properties\":{\"name\":\"ww\",\"fieldLength\":0,\"_typeChanged\":\"String\",\"dataKey\":\"ww\",\"dataPath\":\"ww\"}}}", "headers": [], "relatedSchemas": { "outgoing": [] }, "role": { "roles": [{ "_id": "5d564eae4501037d628add2a", "skipReviewRole": true, "id": "P8450281836", "name": "Skip Review testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add2f", "method": "SKIP_REVIEW" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2e", "method": "POST" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2d", "method": "PUT" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2c", "method": "DELETE" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2b", "method": "GET" }], "description": "This role entitles an authorized user to create, update or delete a record and without any approval" }, { "_id": "5d564eae4501037d628add25", "manageRole": true, "id": "P7105626488", "name": "Manage testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add29", "method": "POST" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add28", "method": "PUT" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add27", "method": "DELETE" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add26", "method": "GET" }], "description": "This role entitles an authorized user to create, update or delete a record" }, { "_id": "5d564eae4501037d628add23", "q": true, "id": "P5387634253", "name": "View testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add24", "method": "GET" }], "description": "This role entitles an authorized user to view the record" }, { "id": "P5143001653", "name": "testnew", "operations": [{ "method": "GET" }] }], "type": "appcenter", "fields": { "_id": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } }, "ss": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } }, "ww": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } } } }, "versionValidity": { "validityType": "count", "validityValue": -1 }, "draftVersion": 1 };

            ServiceMock
                .expects('findOne')
                .withArgs({ _id: id, '_metadata.deleted': false })
                .returns(Promise.resolve(new Service(dbsServiceData)))

            ServiceDraftMock
                .expects('findOne')
                .withArgs({ _id: id, '_metadata.deleted': false })
                .returns(Promise.resolve(new Service(dbsServiceData)))

            ServiceMock
                .expects('find')
                .withArgs({ _id: { '$in': [] } })
                .returns(Promise.resolve([]));

            GlobalServiceMock
                .expects('find')
                .resolves(Promise.resolve([]));

            let save = sinon.stub(Service.prototype, 'save');
            save.returns(Promise.resolve(dbsServiceData));

            let draftSave = sinon.stub(ServiceDraft.prototype, 'save');
            draftSave.returns(Promise.resolve(dbsServiceData));

            let gssave = sinon.stub(GlobalService.prototype, 'save');
            gssave.returns(Promise.resolve({}));

            smcControllerRewire.update(req, response)
                .then(_d => {
                    assert(statusSpy.withArgs(200).calledOnce);
                    statusSpy.restore();
                    done();
                })
        });


        it('e.updateDoc on User Relation', function (done) {
            // smcControllerRewire = rewire("../api/controllers/serviceManager.controller");
            let id = 'SRVC1001';
            let request = {
                swagger: { params: { id: { value: id } } },
                body: {
                    name: 'test',
                    api: '/test',
                    permanentDeleteData: true,
                    app: 'Adam',
                    definition:
                    {
                        "_id": {
                          "prefix": "AAA",
                          "suffix": null,
                          "padding": null,
                          "counter": 1001,
                          "properties": {
                            "name": "ID",
                            "dataKey": "_id",
                            "dataPath": "_id"
                          }
                        },
                        "abcs": {
                          "type": "String",
                          "properties": {
                            "name": "abcs",
                            "fieldLength": 0,
                            "_typeChanged": "String",
                            "dataKey": "abcs",
                            "dataPath": "abcs"
                          }
                        },
                        "user": {
                          "type": "User",
                          "properties": {
                            "name": "user",
                            "fieldLength": 0,
                            "_typeChanged": "User",
                            "deleteAction": "restrict",
                            "relatedSearchField": "_id",
                            "relatedViewFields": [
                              
                            ],
                            "dataKey": "user",
                            "dataPath": "user"
                          }
                        }
                      },
                    enableSearchIndex: false,
                }
            };
            const req = mockExpress.mockReq(request);
            const res = mockExpress.mockRes();
            const response = {
                status() { return res },
                send() { },
                json() { }
            };
            const statusSpy = sinon.spy(response, 'status');
            let dbsServiceData = { "_id": id, "workflowHooks": { "postHooks": { "submit": [], "rework": [], "discard": [], "approve": [], "reject": [] } }, "_metadata": { "version": { "document": 8, "release": null }, "deleted": false, "lastUpdated": "2019-08-16T06:38:37.319Z", "createdAt": "2019-08-16T05:57:33.212Z" }, "version": 3, "instances": 1, "permanentDeleteData": true, "status": "Draft", "enableSearchIndex": false, "attributeCount": 3, "name": "testRole2", "description": null, "app": "Adam", "api": "/testRole2", "port": 20015, "wizard": [], "attributeList": [{"_id":"5d8b13dc9aca52500b9224d9","key":"_id","name":"ID"},{"_id":"5d8b13dc9aca52500b9224d8","key":"abcs","name":"abcs","properties":{"name":"abcs","_type":"String","required":false,"fieldLength":0,"_description":null,"_typeChanged":"String","_detailedType":"","default":null,"createOnly":false,"unique":false,"_listInput":null,"enum":[],"minlength":null,"maxlength":null,"pattern":null,"email":false,"password":false,"longText":false,"richText":false,"hasTokens":[]}},{"_id":"5d8b13dc9aca52500b9224d7","key":"user","name":"user","properties":{"name":"user","_type":"User","required":false,"fieldLength":0,"_description":null,"_typeChanged":"User","_detailedType":"","default":null,"createOnly":false,"unique":false,"deleteAction":"restrict","relatedSearchField":"_id","_listInput":null,"relatedViewFields":[]}}], "webHooks": [], "preHooks": [], "collectionName": "testRole2", "__v": 3, "definition": "{\"_id\":{\"prefix\":\"AAA\",\"suffix\":null,\"padding\":null,\"counter\":1001,\"properties\":{\"name\":\"ID\",\"dataKey\":\"_id\",\"dataPath\":\"_id\"}},\"abcs\":{\"type\":\"String\",\"properties\":{\"name\":\"abcs\",\"fieldLength\":0,\"_typeChanged\":\"String\",\"dataKey\":\"abcs\",\"dataPath\":\"abcs\"}},\"user\":{\"type\":\"User\",\"definition\":{\"_id\":{\"type\":\"String\",\"properties\":{\"name\":\"_id\"}}},\"properties\":{\"name\":\"user\",\"fieldLength\":0,\"_typeChanged\":\"User\",\"deleteAction\":\"restrict\",\"relatedSearchField\":\"_id\",\"relatedViewFields\":[],\"dataKey\":\"user\",\"dataPath\":\"user\"}}}", "headers": [], "relatedSchemas": { "outgoing": [],"internal": {"users": [{"path": "{\"user\":\"User\"}", "isRequired": true, "filter": "{ \"user._id\":\"{{id}}\"}"}]} }, "role": { "roles": [{ "_id": "5d564eae4501037d628add2a", "skipReviewRole": true, "id": "P8450281836", "name": "Skip Review testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add2f", "method": "SKIP_REVIEW" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2e", "method": "POST" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2d", "method": "PUT" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2c", "method": "DELETE" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2b", "method": "GET" }], "description": "This role entitles an authorized user to create, update or delete a record and without any approval" }, { "_id": "5d564eae4501037d628add25", "manageRole": true, "id": "P7105626488", "name": "Manage testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add29", "method": "POST" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add28", "method": "PUT" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add27", "method": "DELETE" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add26", "method": "GET" }], "description": "This role entitles an authorized user to create, update or delete a record" }, { "_id": "5d564eae4501037d628add23", "viewRole": true, "id": "P5387634253", "name": "View testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add24", "method": "GET" }], "description": "This role entitles an authorized user to view the record" }, { "id": "P5143001653", "name": "testnew", "operations": [{ "method": "GET" }] }], "type": "appcenter", "fields": { "_id": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } }, "ss": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } }, "ww": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } } } }, "versionValidity": { "validityType": "count", "validityValue": -1 }, "draftVersion": null }

            ServiceMock
                .expects('findOne')
                .withArgs({ _id: id, '_metadata.deleted': false })
                .returns(Promise.resolve(new Service(dbsServiceData)))

            ServiceMock
                .expects('find')
                .withArgs({ _id: { $in: [] } })
                .returns(Promise.resolve([]))


            GlobalServiceMock
                .expects('find')
                .withArgs({ app: "Adam" }, { _id: 1, name: 1 })
                .resolves(Promise.resolve([])).twice();

            GlobalServiceMock
                .expects('find')
                .withArgs({ app: "Adam", definition: { $exists: true } }, 'name definition')
                .resolves(Promise.resolve([])).twice();

            GlobalServiceMock
                .expects('find')
                .withArgs({ services: "SRVC1001" })
                .resolves(Promise.resolve([])).once();

            let save = sinon.stub(Service.prototype, 'save');
            save.returns(Promise.resolve(dbsServiceData));

            let draftSave = sinon.stub(ServiceDraft.prototype, 'save');
            draftSave.returns(Promise.resolve(dbsServiceData));

            let gssave = sinon.stub(GlobalService.prototype, 'save');
            gssave.returns(Promise.resolve({}));
            smcControllerRewire.update(req, response)
                .then(_d => {
                    assert(statusSpy.withArgs(200).calledOnce);
                    done();
                })
        });

        it('e.updateDoc on Secure text', function (done) {
            let id = 'SRVC1001';
            let request = {
                swagger: { params: { id: { value: id } } },
                body: {
                    name: 'test', api: '/test', permanentDeleteData: true, app: 'Adam',
                    definition:
                    {
                        "_id": {
                          "prefix": "AAA",
                          "suffix": null,
                          "padding": null,
                          "counter": 1001,
                          "properties": {
                            "name": "ID",
                            "dataKey": "_id",
                            "dataPath": "_id"
                          }
                        },
                        "secure": {
                            "type": "String",
                            "properties": {
                              "name": "secure",
                              "fieldLength": 0,
                              "_typeChanged": "String",
                              "password": true,
                              "dataKey": "secure",
                              "dataPath": "secure"
                            }
                          }
                      },
                    enableSearchIndex: false,
                }
            };
            const req = mockExpress.mockReq(request);
            const res = mockExpress.mockRes();
            const response = {
                status() { return res },
                send() { },
                json() { }
            };
            const statusSpy = sinon.spy(response, 'status');
            let dbsServiceData = {"_id":"ext-gen1","workflowHooks":{"postHooks":{"submit":[],"rework":[],"discard":[],"approve":[],"reject":[]}},"_metadata":{"version":{"document":8,"release":null},"deleted":false,"lastUpdated":"2019-08-16T06:38:37.319Z","createdAt":"2019-08-16T05:57:33.212Z"},"version":3,"instances":1,"permanentDeleteData":true,"status":"Draft","enableSearchIndex":false,"attributeCount":3,"name":"testRole2","description":null,"app":"Adam","api":"/testRole2","port":20015,"wizard":[],"attributeList":[{"_id":"5d8b13dc9aca52500b9224d9","key":"_id","name":"ID"},{"_id":"5d91b2ba4282fe34534d23f7","key":"secure","name":"secure","properties":{"_type":"String","name":"secure","required":false,"fieldLength":0,"_description":null,"_typeChanged":"String","_detailedType":"password","default":null,"createOnly":false,"unique":false,"_listInput":null,"minlength":null,"maxlength":null,"pattern":null,"email":false,"password":true,"longText":false,"richText":false,"enum":[],"hasTokens":[]}}],"webHooks":[],"preHooks":[],"collectionName":"testRole2","__v":3,"definition":"{\"_id\":{\"prefix\":\"FGH\",\"suffix\":null,\"padding\":null,\"counter\":1001,\"properties\":{\"name\":\"ID\",\"dataKey\":\"_id\",\"dataPath\":\"_id\"}},\"secure\":{\"type\":\"Object\",\"definition\":{\"value\":{\"type\":\"String\",\"properties\":{\"name\":\"value\",\"_typeChanged\":\"String\"}},\"checksum\":{\"type\":\"String\",\"properties\":{\"name\":\"checksum\",\"_typeChanged\":\"String\"}}},\"properties\":{\"name\":\"secure\",\"fieldLength\":0,\"_typeChanged\":\"String\",\"password\":true,\"dataKey\":\"secure\",\"dataPath\":\"secure\"}}}","headers":[],"relatedSchemas":{"outgoing":[],"internal":{"users":[]}},"role":{"roles":[{"_id":"5d564eae4501037d628add2a","skipReviewRole":true,"id":"P8450281836","name":"Skip Review testRole2","operations":[{"workflowRoles":[],"_id":"5d564eae4501037d628add2f","method":"SKIP_REVIEW"},{"workflowRoles":[],"_id":"5d564eae4501037d628add2e","method":"POST"},{"workflowRoles":[],"_id":"5d564eae4501037d628add2d","method":"PUT"},{"workflowRoles":[],"_id":"5d564eae4501037d628add2c","method":"DELETE"},{"workflowRoles":[],"_id":"5d564eae4501037d628add2b","method":"GET"}],"description":"This role entitles an authorized user to create, update or delete a record and without any approval"},{"_id":"5d564eae4501037d628add25","manageRole":true,"id":"P7105626488","name":"Manage testRole2","operations":[{"workflowRoles":[],"_id":"5d564eae4501037d628add29","method":"POST"},{"workflowRoles":[],"_id":"5d564eae4501037d628add28","method":"PUT"},{"workflowRoles":[],"_id":"5d564eae4501037d628add27","method":"DELETE"},{"workflowRoles":[],"_id":"5d564eae4501037d628add26","method":"GET"}],"description":"This role entitles an authorized user to create, update or delete a record"},{"_id":"5d564eae4501037d628add23","viewRole":true,"id":"P5387634253","name":"View testRole2","operations":[{"workflowRoles":[],"_id":"5d564eae4501037d628add24","method":"GET"}],"description":"This role entitles an authorized user to view the record"},{"id":"P5143001653","name":"testnew","operations":[{"method":"GET"}]}],"type":"appcenter","fields":{"_id":{"_t":"String","_p":{"P8450281836":"R","P7105626488":"R","P5387634253":"R","P5143001653":"R"}},"ss":{"_t":"String","_p":{"P8450281836":"R","P7105626488":"R","P5387634253":"R","P5143001653":"R"}},"ww":{"_t":"String","_p":{"P8450281836":"R","P7105626488":"R","P5387634253":"R","P5143001653":"R"}}}},"versionValidity":{"validityType":"count","validityValue":-1},"draftVersion":null}
            
            ServiceMock
                .expects('findOne')
                .withArgs({ _id: id, '_metadata.deleted': false })
                .returns(Promise.resolve(new Service(dbsServiceData)))

            ServiceMock
                .expects('find')
                .withArgs({ _id: { $in: [] } })
                .returns(Promise.resolve([]))

            GlobalServiceMock
                .expects('find')
                .withArgs({ app: "Adam" }, { _id: 1, name: 1 })
                .resolves(Promise.resolve([])).twice();

            GlobalServiceMock
                .expects('find')
                .withArgs({ app: "Adam", definition: { $exists: true } }, 'name definition')
                .resolves(Promise.resolve([])).twice();

            GlobalServiceMock
                .expects('find')
                .withArgs({ services: "SRVC1001" })
                .resolves(Promise.resolve([])).once();

            let save = sinon.stub(Service.prototype, 'save');
            save.returns(Promise.resolve(dbsServiceData));

            let draftSave = sinon.stub(ServiceDraft.prototype, 'save');
            draftSave.returns(Promise.resolve(dbsServiceData));

            let gssave = sinon.stub(GlobalService.prototype, 'save');
            gssave.returns(Promise.resolve({}));
            smcControllerRewire.update(req, response)
            .then(_d => {
                assert(statusSpy.withArgs(200).calledOnce);
                done();
            })
        });
    });

    describe('Deploying a data service', function () {
        var ServiceMock = null;
        var GlobalServiceMock = null;
        var Service = null;
        var ServiceDraft = null;
        var GlobalService = null;

        beforeEach(() => {
            var validateApp = sinon.stub(smHooks, 'validateApp');
            validateApp.returns(Promise.resolve());

            var updateExpiry = sinon.stub(smHooks, 'updateExpiry');
            updateExpiry.returns(Promise.resolve());

            smcControllerRewire.__set__("apiUniqueCheck", (a, b) => Promise.resolve());
            smcControllerRewire.__set__("nameUniqueCheck", (a, b) => Promise.resolve());
            smcControllerRewire.__set__("validateCounterChange", () => Promise.resolve());
            smcControllerRewire.__set__("renameCollections", () => Promise.resolve());
            Service = mongoose.model('services');
            ServiceMock = sinon.mock(Service);
            GlobalService = mongoose.model('globalSchema');
            GlobalServiceMock = sinon.mock(GlobalService);
            ServiceDraft = mongoose.model('services.draft');
            ServiceDraftMock = sinon.mock(ServiceDraft);

            var deployService = sinon.stub(deployUtil, 'deployService');
            deployService.returns(Promise.resolve());

            var updateRolesUserMgmt = sinon.stub(deployUtil, 'updateRolesUserMgmt');
            updateRolesUserMgmt.returns(Promise.resolve());
        });
        afterEach(() => {
            sinon.restore();
            ServiceMock.restore();
            GlobalServiceMock.restore();
        });

        it('e.deployService on Draft Data service.', function (done) {
            // smcControllerRewire = rewire("../api/controllers/serviceManager.controller");
            let id = 'SRVC1001';
            let request = {
                swagger: { params: { id: { value: id } } },
                app: {
                    get: (a) => { if (a == 'socket') return 'dummySocket' }
                }
            };
            const req = mockExpress.mockReq(request);
            const res = mockExpress.mockRes();

            const response = {
                status() { return res },
                send() { },
                json() { }
            };
            const statusSpy = sinon.spy(response, 'status');

            let dbsServiceData = { "_id": id, "workflowHooks": { "postHooks": { "submit": [], "rework": [], "discard": [], "approve": [], "reject": [] } }, "_metadata": { "version": { "document": 8, "release": null }, "deleted": false, "lastUpdated": "2019-08-16T06:38:37.319Z", "createdAt": "2019-08-16T05:57:33.212Z" }, "version": 3, "instances": 1, "permanentDeleteData": true, "status": "Draft", "enableSearchIndex": false, "attributeCount": 3, "name": "testRole2", "description": null, "app": "Adam", "api": "/testRole2", "port": 20015, "wizard": [], "attributeList": [{ "_id": "5d564f5e1d7aee40d842d38c", "key": "_id", "name": "ID" }, { "_id": "5d564f5e1d7aee40d842d38b", "key": "ss", "name": "ss", "properties": { "_type": "String", "name": "ss", "required": false, "fieldLength": 0, "_description": null, "_typeChanged": "String", "_detailedType": "", "default": null, "createOnly": false, "unique": false, "_listInput": null, "enum": [], "minlength": null, "maxlength": null, "pattern": null, "email": false, "password": false, "longText": false, "richText": false, "hasTokens": [] } }, { "_id": "5d564f5e1d7aee40d842d38a", "key": "ww", "name": "ww", "properties": { "_type": "String", "name": "ww", "required": false, "fieldLength": 0, "_description": null, "_typeChanged": "String", "_detailedType": "", "default": null, "createOnly": false, "unique": false, "_listInput": null, "enum": [], "minlength": null, "maxlength": null, "pattern": null, "email": false, "password": false, "longText": false, "richText": false, "hasTokens": [] } }], "webHooks": [], "preHooks": [], "collectionName": "testRole2", "__v": 3, "definition": "{\"_id\":{\"prefix\":\"TES\",\"suffix\":null,\"padding\":null,\"counter\":1001,\"properties\":{\"name\":\"ID\",\"dataKey\":\"_id\",\"dataPath\":\"_id\"}},\"ss\":{\"type\":\"String\",\"properties\":{\"name\":\"ss\",\"fieldLength\":0,\"_typeChanged\":\"String\",\"dataKey\":\"ss\",\"dataPath\":\"ss\"}},\"ww\":{\"type\":\"String\",\"properties\":{\"name\":\"ww\",\"fieldLength\":0,\"_typeChanged\":\"String\",\"dataKey\":\"ww\",\"dataPath\":\"ww\"}}}", "headers": [], "relatedSchemas": { "outgoing": [] }, "role": { "roles": [{ "_id": "5d564eae4501037d628add2a", "skipReviewRole": true, "id": "P8450281836", "name": "Skip Review testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add2f", "method": "SKIP_REVIEW" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2e", "method": "POST" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2d", "method": "PUT" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2c", "method": "DELETE" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2b", "method": "GET" }], "description": "This role entitles an authorized user to create, update or delete a record and without any approval" }, { "_id": "5d564eae4501037d628add25", "manageRole": true, "id": "P7105626488", "name": "Manage testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add29", "method": "POST" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add28", "method": "PUT" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add27", "method": "DELETE" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add26", "method": "GET" }], "description": "This role entitles an authorized user to create, update or delete a record" }, { "_id": "5d564eae4501037d628add23", "viewRole": true, "id": "P5387634253", "name": "View testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add24", "method": "GET" }], "description": "This role entitles an authorized user to view the record" }, { "id": "P5143001653", "name": "testnew", "operations": [{ "method": "GET" }] }], "type": "appcenter", "fields": { "_id": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } }, "ss": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } }, "ww": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } } } }, "versionValidity": { "validityType": "count", "validityValue": -1 }, "draftVersion": null }

            ServiceMock
                .expects('findOne')
                .withArgs({ _id: id, '_metadata.deleted': false })
                .returns(Promise.resolve(new Service(dbsServiceData)))

            ServiceMock
                .expects('find')
                .withArgs({ _id: { $in: [] } })
                .returns(Promise.resolve([]))


            GlobalServiceMock
                .expects('find')
                .withArgs({ app: "Adam" }, { _id: 1, name: 1 })
                .resolves(Promise.resolve([])).twice();

            GlobalServiceMock
                .expects('find')
                .withArgs({ app: "Adam", definition: { $exists: true } }, 'name definition')
                .resolves(Promise.resolve([])).twice();

            // GlobalServiceMock
            //     .expects('find')
            //     .withArgs({ services: "SRVC1001" })
            //     .resolves(Promise.resolve([])).atmost();

            let save = sinon.stub(Service.prototype, 'save');
            save.returns(Promise.resolve(dbsServiceData));

            let draftSave = sinon.stub(ServiceDraft.prototype, 'save');
            draftSave.returns(Promise.resolve(dbsServiceData));

            let gssave = sinon.stub(GlobalService.prototype, 'save');
            gssave.returns(Promise.resolve({}));

            smcControllerRewire.deployService(req, response)
                .then(_d => {
                    assert(statusSpy.calledOnce);
                    done();
                })
        });

        it('e.deployService on Active Data service and draft version null.', function (done) {
            // smcControllerRewire = rewire("../api/controllers/serviceManager.controller");
            let id = 'SRVC1001';
            let request = {
                swagger: { params: { id: { value: id } } },
                app: {
                    get: (a) => { if (a == 'socket') return 'dummySocket' }
                }
            };
            const req = mockExpress.mockReq(request);
            const res = mockExpress.mockRes();
            const response = {
                status() { return res },
                send() { },
                json() { }
            };
            const statusSpy = sinon.spy(response, 'status');

            let dbsServiceData = { "_id": id, "workflowHooks": { "postHooks": { "submit": [], "rework": [], "discard": [], "approve": [], "reject": [] } }, "_metadata": { "version": { "document": 8, "release": null }, "deleted": false, "lastUpdated": "2019-08-16T06:38:37.319Z", "createdAt": "2019-08-16T05:57:33.212Z" }, "version": 3, "instances": 1, "permanentDeleteData": true, "status": "Active", "enableSearchIndex": false, "attributeCount": 3, "name": "test", "description": null, "app": "Adam", "api": "/test", "port": 20015, "wizard": [], "attributeList": [{ "_id": "5d564f5e1d7aee40d842d38c", "key": "_id", "name": "ID" }, { "_id": "5d564f5e1d7aee40d842d38b", "key": "ss", "name": "ss", "properties": { "_type": "String", "name": "ss", "required": false, "fieldLength": 0, "_description": null, "_typeChanged": "String", "_detailedType": "", "default": null, "createOnly": false, "unique": false, "_listInput": null, "enum": [], "minlength": null, "maxlength": null, "pattern": null, "email": false, "password": false, "longText": false, "richText": false, "hasTokens": [] } }, { "_id": "5d564f5e1d7aee40d842d38a", "key": "ww", "name": "ww", "properties": { "_type": "String", "name": "ww", "required": false, "fieldLength": 0, "_description": null, "_typeChanged": "String", "_detailedType": "", "default": null, "createOnly": false, "unique": false, "_listInput": null, "enum": [], "minlength": null, "maxlength": null, "pattern": null, "email": false, "password": false, "longText": false, "richText": false, "hasTokens": [] } }], "webHooks": [], "preHooks": [], "collectionName": "testRole2", "__v": 3, "definition": "{\"_id\":{\"prefix\":\"TES\",\"suffix\":null,\"padding\":null,\"counter\":1001,\"properties\":{\"name\":\"ID\",\"dataKey\":\"_id\",\"dataPath\":\"_id\"}},\"ss\":{\"type\":\"String\",\"properties\":{\"name\":\"ss\",\"fieldLength\":0,\"_typeChanged\":\"String\",\"dataKey\":\"ss\",\"dataPath\":\"ss\"}},\"ww\":{\"type\":\"String\",\"properties\":{\"name\":\"ww\",\"fieldLength\":0,\"_typeChanged\":\"String\",\"dataKey\":\"ww\",\"dataPath\":\"ww\"}}}", "headers": [], "relatedSchemas": { "outgoing": [] }, "role": { "roles": [{ "_id": "5d564eae4501037d628add2a", "skipReviewRole": true, "id": "P8450281836", "name": "Skip Review testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add2f", "method": "SKIP_REVIEW" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2e", "method": "POST" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2d", "method": "PUT" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2c", "method": "DELETE" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2b", "method": "GET" }], "description": "This role entitles an authorized user to create, update or delete a record and without any approval" }, { "_id": "5d564eae4501037d628add25", "manageRole": true, "id": "P7105626488", "name": "Manage testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add29", "method": "POST" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add28", "method": "PUT" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add27", "method": "DELETE" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add26", "method": "GET" }], "description": "This role entitles an authorized user to create, update or delete a record" }, { "_id": "5d564eae4501037d628add23", "q": true, "id": "P5387634253", "name": "View testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add24", "method": "GET" }], "description": "This role entitles an authorized user to view the record" }, { "id": "P5143001653", "name": "testnew", "operations": [{ "method": "GET" }] }], "type": "appcenter", "fields": { "_id": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } }, "ss": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } }, "ww": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } } } }, "versionValidity": { "validityType": "count", "validityValue": -1 }, "draftVersion": null };

            ServiceMock
                .expects('findOne')
                .withArgs({ _id: id, '_metadata.deleted': false })
                .returns(Promise.resolve(new Service(dbsServiceData)))

            ServiceMock
                .expects('find')
                .withArgs({ _id: { '$in': [] } })
                .returns(Promise.resolve([]));

            GlobalServiceMock
                .expects('find')
                .resolves(Promise.resolve([]));

            let save = sinon.stub(Service.prototype, 'save');
            save.returns(Promise.resolve(dbsServiceData));

            let draftSave = sinon.stub(ServiceDraft.prototype, 'save');
            draftSave.returns(Promise.resolve(dbsServiceData));

            let gssave = sinon.stub(GlobalService.prototype, 'save');
            gssave.returns(Promise.resolve({}));

            smcControllerRewire.deployService(req, response)
                .then(_d => {
                    assert(statusSpy.withArgs(400).calledOnce);
                    done();
                })
        });

        it('e.deployService on Active Data service and draft version exist.', function (done) {
            // smcControllerRewire = rewire("../api/controllers/serviceManager.controller");
            let id = 'SRVC1001';
            let request = {
                swagger: { params: { id: { value: id } } },
                app: {
                    get: (a) => { if (a == 'socket') return 'dummySocket' }
                }
            };
            const req = mockExpress.mockReq(request);
            const res = mockExpress.mockRes();

            const response = {
                status(a) { res.statusCode = a; return res },
                send() { },
                json() { }
            };
            const statusSpy = sinon.spy(response, 'status');

            let dbsServiceData = { "_id": id, "workflowHooks": { "postHooks": { "submit": [], "rework": [], "discard": [], "approve": [], "reject": [] } }, "_metadata": { "version": { "document": 8, "release": null }, "deleted": false, "lastUpdated": "2019-08-16T06:38:37.319Z", "createdAt": "2019-08-16T05:57:33.212Z" }, "version": 3, "instances": 1, "permanentDeleteData": true, "status": "Active", "enableSearchIndex": false, "attributeCount": 3, "name": "test", "description": null, "app": "Adam", "api": "/test", "port": 20015, "wizard": [], "attributeList": [{ "_id": "5d564f5e1d7aee40d842d38c", "key": "_id", "name": "ID" }, { "_id": "5d564f5e1d7aee40d842d38b", "key": "ss", "name": "ss", "properties": { "_type": "String", "name": "ss", "required": false, "fieldLength": 0, "_description": null, "_typeChanged": "String", "_detailedType": "", "default": null, "createOnly": false, "unique": false, "_listInput": null, "enum": [], "minlength": null, "maxlength": null, "pattern": null, "email": false, "password": false, "longText": false, "richText": false, "hasTokens": [] } }, { "_id": "5d564f5e1d7aee40d842d38a", "key": "ww", "name": "ww", "properties": { "_type": "String", "name": "ww", "required": false, "fieldLength": 0, "_description": null, "_typeChanged": "String", "_detailedType": "", "default": null, "createOnly": false, "unique": false, "_listInput": null, "enum": [], "minlength": null, "maxlength": null, "pattern": null, "email": false, "password": false, "longText": false, "richText": false, "hasTokens": [] } }], "webHooks": [], "preHooks": [], "collectionName": "testRole2", "__v": 3, "definition": "{\"_id\":{\"prefix\":\"TES\",\"suffix\":null,\"padding\":null,\"counter\":1001,\"properties\":{\"name\":\"ID\",\"dataKey\":\"_id\",\"dataPath\":\"_id\"}},\"ss\":{\"type\":\"String\",\"properties\":{\"name\":\"ss\",\"fieldLength\":0,\"_typeChanged\":\"String\",\"dataKey\":\"ss\",\"dataPath\":\"ss\"}},\"ww\":{\"type\":\"String\",\"properties\":{\"name\":\"ww\",\"fieldLength\":0,\"_typeChanged\":\"String\",\"dataKey\":\"ww\",\"dataPath\":\"ww\"}}}", "headers": [], "relatedSchemas": { "outgoing": [] }, "role": { "roles": [{ "_id": "5d564eae4501037d628add2a", "skipReviewRole": true, "id": "P8450281836", "name": "Skip Review testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add2f", "method": "SKIP_REVIEW" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2e", "method": "POST" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2d", "method": "PUT" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2c", "method": "DELETE" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add2b", "method": "GET" }], "description": "This role entitles an authorized user to create, update or delete a record and without any approval" }, { "_id": "5d564eae4501037d628add25", "manageRole": true, "id": "P7105626488", "name": "Manage testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add29", "method": "POST" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add28", "method": "PUT" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add27", "method": "DELETE" }, { "workflowRoles": [], "_id": "5d564eae4501037d628add26", "method": "GET" }], "description": "This role entitles an authorized user to create, update or delete a record" }, { "_id": "5d564eae4501037d628add23", "q": true, "id": "P5387634253", "name": "View testRole2", "operations": [{ "workflowRoles": [], "_id": "5d564eae4501037d628add24", "method": "GET" }], "description": "This role entitles an authorized user to view the record" }, { "id": "P5143001653", "name": "testnew", "operations": [{ "method": "GET" }] }], "type": "appcenter", "fields": { "_id": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } }, "ss": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } }, "ww": { "_t": "String", "_p": { "P8450281836": "R", "P7105626488": "R", "P5387634253": "R", "P5143001653": "R" } } } }, "versionValidity": { "validityType": "count", "validityValue": -1 }, "draftVersion": 1 };

            ServiceMock
                .expects('findOne')
                .withArgs({ _id: id, '_metadata.deleted': false })
                .returns(Promise.resolve(new Service(dbsServiceData)))

            
            let draftServiceDoc = new Service(dbsServiceData);
            draftServiceDoc.remove = function(){
                return Promise.resolve();
            }
            ServiceDraftMock
                .expects('findOne')
                .withArgs({ _id: id, '_metadata.deleted': false })
                .returns(Promise.resolve(draftServiceDoc))

            ServiceMock
                .expects('find')
                .withArgs({ _id: { '$in': [] } })
                .returns(Promise.resolve([]));

            GlobalServiceMock
                .expects('find')
                .resolves(Promise.resolve([])).twice();

            let save = sinon.stub(Service.prototype, 'save');
            save.returns(Promise.resolve(dbsServiceData));

            let draftSave = sinon.stub(ServiceDraft.prototype, 'save');
            draftSave.returns(Promise.resolve(dbsServiceData));

            let draftRemove = sinon.stub(ServiceDraft.prototype, 'remove');
            draftRemove.returns(Promise.resolve());

            let gssave = sinon.stub(GlobalService.prototype, 'save');
            gssave.returns(Promise.resolve({}));

            smcControllerRewire.deployService(req, response)
                .then(_d => {
                    assert(statusSpy.withArgs(202).calledOnce);
                    done();
                    // assert("Success")
                })
        });
    });

});