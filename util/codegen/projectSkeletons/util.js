const envConfig = require('../../../config/config');

function helperUtil(config) {
	var modelName = config.collectionName;
	let prefix = config.idDetails.prefix ? `"${config.idDetails.prefix}"` : null;
	let suffix = config.idDetails.suffix ? `"${config.idDetails.suffix}"` : null;
	let padding = config.idDetails.padding ? config.idDetails.padding : null;
	let counter = config.idDetails.counter || config.idDetails.counter === 0 ? config.idDetails.counter : null;
	return `
    let logger = global.logger;
    const request = require("request");
    const fs = require('fs');
    let cuti = require('@appveen/utils');
    let mongoose = require('mongoose');
    const serviceId = process.env.SERVICE_ID|| '${config._id}';
    const crypto = require('crypto');
    let _ = require('lodash');
    let e = {};
    let queueMgmt = require('../../queueManagement');
    var client = queueMgmt.client;
    const odpNS = process.env.ODP_NAMESPACE;
    let uniqueFields = '${config.uniqueFields.map(_obj => _obj.key)}'.split(',');
    let config = require('./../../config');
    e.generateCodeToExpand = function(schema, key, action) {
        if (typeof schema === 'object' && Object.keys(schema)[0] === '_self') {
            return embedLoopCode(schema['_self'], key, action);
        } else if (typeof schema === 'object') {
            return e.generateCodeToExpand(schema[Object.keys(schema)[0]], \`\${key}.\${Object.keys(schema)[0]}\`, action)
        } else {
            return action === "get" ? \`
            try{
                if(\${key}){
                    list.push(\${key}._id);
                }
            }catch(err){}
            \` : \`
            try{
                if(\${key}){
                    let _doc = docList.find(_d => _d._id == \${key}._id)
                    if(_doc){
                        \${key} = _doc;   
                    }
                }
            }catch(err){}
            \`;
        }
    }
    
    e.getPreHooks = function(){
        return ${JSON.stringify(config.preHooks)};
    }
    e.getExperienceHook = function (uid) {
        let allHooks = ${JSON.stringify(config.wizard)};
        if(allHooks){
            allHooks = [].concat.apply([], allHooks.map(_d=>_d.actions));
            logger.info(allHooks);
            let wantedHook = allHooks.find(function (element) {
                if (uid == element.name)
                    return element;
            });
            if (wantedHook) {
                return wantedHook;
            }
            else {
                return null;
            }
        }else{
            return null;
        }
    
    }



    function embedLoopCode(schema, key, action) {
        let code = \`
        try{
        \${key}.forEach((obj, _i, arr) => {
             \`
        if (typeof schema !== "object") {
            code += action === "get" ? \`
            
                if(obj){
                    list.push(obj._id);
                }
            \` : \`
                if(obj){
                    let _doc = docList.find(_d => _d["_id"] == obj._id)
                    if(_doc){
                        Object.keys(_doc).forEach(_k=>{
                            if(typeof arr[_i] === 'object'){
                                arr[_i][_k] = _doc[_k]
                            }
                        })
                           
                    }
                }
            \`;
        } else {
            code += \`\${e.generateCodeToExpand(schema, 'obj', action)}\`
        }
        code += \`
    })
    }catch(err){}\`
        return code;
    }

    e.crudDocuments = function(_service, method, body, qs, req) {
        let HOST = _service.host;
        let PORT = _service.port;
        if((!(process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT)) && fs.existsSync("/.dockerenv")){
            if (process.env.PLATFORM != 'NIX') HOST = "host.docker.internal";
        } 
        var options = {
            url: "http://" + HOST + ":" + PORT + _service.uri,
            method: method.toUpperCase(),
            headers: {
                "Content-Type": "application/json",
                "TxnId": req.get('txnId'),
                "Authorization": req.get("Authorization"),
                'Cache': req.get("cache")
            },
            json:true
        };
        if(body){
            options.body = body;
        }
        if (qs) options.qs = JSON.parse(JSON.stringify(qs));
        return new Promise((resolve, reject) => {
            request[method.toLowerCase()](options, function (err, res, body) {
                if (err) {
                    logger.error("Error requesting Service " + options.url);
                    logger.error(err);
                    reject(new Error("Error requesting Service"));
                } else if (!res) {
                    reject(new Error("Service Down"));
                } else {
                    if (res.statusCode == 200) resolve(body);
                    else {
                        if(body && body.message) 
                            reject(new Error(body.message));
                        else 
                            reject(new Error(JSON.stringify(body)));
                    }
                }
            });
        });
    }

    e.isWorkflowPresent = function (docId, serviceId, req){
        return e.getWorkFlows(docId, serviceId, req)
            .then(_wfs => {
                if(_wfs && _wfs.length > 0){
                    return true
                } else{
                    return false;
                }
            })
    }

    e.getWorkFlows = function(docId, serviceId, req){
        var options = {
            url: "${envConfig.baseUrlWF}",
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "TxnId": req.get('txnId'),
                "Authorization" : req.get("Authorization")
            },
            qs:{
                filter:{'documentId': docId, 'serviceId': serviceId, 'status': 'Pending'}
            },
            json: true
        };
        return new Promise((resolve, reject) => {
            request.get(options, function (err, res, body) {
                if (err) {
                    logger.error("Error requesting Workflow service")
                    logger.error(e.message);
                    reject(err);
                } else if (!res) {
                    logger.error("Workflow service is down");
                    reject(new Error("Workflow service is down"));
                } else {
                    if (res.statusCode >= 200 && res.statusCode <= 400) {
                        resolve(body);
                    } else {
                        reject(new Error("Something went wrong"));
                    }
                }
            });
        });
    }

    e.getServiceDetail = function(serviceId, req) {
        var options = {
            url: "${envConfig.baseUrlSM}/service/" + serviceId + "?select=port,api,relatedSchemas,app,preHooks",
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "TxnId": req.get('txnId'),
                "Authorization" : req.get("Authorization")
            },
            json: true
        };
        return new Promise((resolve, reject) => {
            request.get(options, function (err, res, body) {
                if (err) {
                    logger.error("Error requesting service-manager normal")
                    logger.error(err.message);
                    reject(err);
                } else if (!res) {
                    logger.error("brahma-service-manager service down");
                    reject(new Error("brahma-service-manager service down"));
                } else {
                    if (res.statusCode === 200) {
                        resolve(body);
                    } else {
                        reject(new Error("Service not found"));
                    }
                }
            });
        });
    }

    e.getStoredServiceDetail = function (serviceId, serviceDetailsObj, req) {
        if (serviceDetailsObj[serviceId]) {
            return Promise.resolve(serviceDetailsObj[serviceId]);
        }  else if (serviceId == 'USER') {
            return Promise.resolve();
        } else {
            var options = {
                url: "${envConfig.baseUrlSM}/service/" + serviceId + "?select=port,api,relatedSchemas,app,preHooks",
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "TxnId": req.get('txnId'),
                    "Authorization": req.get("Authorization")
                },
                json: true
            };
            return new Promise((resolve, reject) => {
                //logger.debug('Requesting SM');
                request.get(options, function (err, res, body) {
                    if (err) {
                        logger.error("Error requesting service-manager in stored")
                        logger.error(err.message);
                        reject(err);
                    } else if (!res) {
                        logger.error("brahma-service-manager service down");
                        reject(new Error("brahma-service-manager service down"));
                    } else {
                        if (res.statusCode === 200) {
                            serviceDetailsObj[serviceId] = body;
                            resolve(body);
                        } else {
                            reject(new Error("Service not found"));
                        }
                    }
                });
            });
        }
    
    }

    e.invokeHook = function(url, data, customErrMsg) {
        let timeout = (process.env.HOOK_CONNECTION_TIMEOUT && parseInt(process.env.HOOK_CONNECTION_TIMEOUT)) || 30;
        var options = {
            url: url,
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            json: true,
            body: data,
            timeout: timeout * 1000
        };
        if (typeof process.env.TLS_REJECT_UNAUTHORIZED === 'string' && process.env.TLS_REJECT_UNAUTHORIZED.toLowerCase() === 'false') {
            options.insecure = true;
            options.rejectUnauthorized = false;
        }
        return new Promise((resolve, reject) => {
            request.post(options, function (err, res, body) {
                let errMsg = null;
                if (err) {
                    logger.error("Error requesting hook "+url)
                    logger.error(e.message);
                    errMsg = customErrMsg ? customErrMsg : 'Pre-save link ' + url + ' down. Unable to proceed. ';
                    reject(new Error(errMsg));
                } else if (!res) {
                    logger.error("Error requesting hook "+url);
                    errMsg = customErrMsg ? customErrMsg : 'Pre-save link ' + url + ' down. Unable to proceed. ';
                    reject(new Error(errMsg));
                } else {
                    if (res.statusCode >= 200 && res.statusCode < 400) {
                        resolve(body);
                    } else {
                        if(body && body.message){
                            errMsg = body.message;
                        }else{
                            errMsg = 'Error invoking pre-save link ' + url + '  .Unable to proceed. ';
                        }
                        reject(new Error(errMsg));
                    }
                }
            });
        });
    }

    e.enrichDataWithPreHooks = function(data, req, operation){
        let self = JSON.parse(JSON.stringify(data));
        return e.getPreHooks().reduce(function(acc, curr){
            let oldData = null;
            let preHookLog = null;
            let newData = null;
            return acc
            .then(data => {
                oldData = data;
                 obje = {
                    "docId": data._id,
                    "service": process.env.SERVICE_ID || '${config._id}',
                    "colName": '${config.collectionName}.preHook',
                    "timestamp": new Date(),
                    "url": curr.url,
                    "operation": operation,
                    "txnId": req.get('txnId'),
                    "userId": req.get('user'),
                    "name": curr.name,
                    "data": {
                        "old": oldData
                    },
                    "status": "Pending",
                    "_metadata":{                      
                    }
                }

                let options = {
                    operation: operation,
                    data: oldData,
                    trigger:{
                        source: req.query ? req.query.source: null,
                        simulate: true
                    },
                    txnId: req.get('txnId'),
                    user: req.get('user'),
                    dataService: process.env.SERVICE_ID || '${config._id}'
                } 
                return e.invokeHook(curr.url, options, curr.failMessage)
            })
            .then(data => {
                newData = Object.assign({}, oldData, data.data);
                newData._metadata = oldData._metadata;
                obje["status"] = "Completed";
                obje._metadata.createdAt= new Date();
                obje._metadata.lastUpdated = new Date();
                obje.data.new = newData;
               // {"status": "Completed", "data.new": newData, "_metadata.lastUpdated": new Date()}
                client.publish("prehookCreate", JSON.stringify(obje));
            })
            .then(() => {
                return newData;
            })
            .catch(err=>{
                      obje["status"] = "Error";
                      obje.data.new = newData;
                      obje["comment"] = err.message;
                      obje._metadata.lastUpdated = new Date();
                    client.publish("prehookCreate", JSON.stringify(obje));
                    //mongoose.model("preHooks").updateOne({ _id: preHookLog._id }, {"status": "Error","comment": err.message, "data.new": newData, "_metadata.lastUpdated": new Date()}).then();
                throw err;
            })
       }, Promise.resolve(self));  
    }

    function fetchReferenceIdsForARelation(path, document) {
        if (!document) return document;
        if (typeof path == 'string') {
            return document._id;
        } else if (path && {}.constructor == path.constructor) {
            let key = Object.keys(path)[0];
            if (key == '_self' && Array.isArray(document)) {
                let val = path[key];
                let ids = document.map(_d => {
                    return fetchReferenceIdsForARelation(val, _d);
                })
                // Flattening the array
                return [].concat.apply([],ids);
            }
            else {
                let val = path[key];
                return fetchReferenceIdsForARelation(val, document[key]);
            }
        }
        return document;
    }
    
    function flattenPath(obj, key) {
        if (typeof obj == 'object') {
            let obKey = Object.keys(obj)[0];
            let newKey = key;
            if (obKey != "_self") newKey = key == '' ? obKey : key + '.' + obKey;
            return flattenPath(obj[obKey], newKey);
        }
        else {
            return key;
        }
    }
    
    e.validateReferenceIds = function (document, serviceDetailCache, documentCache, req) {
        let serviceInfo = global.serviceInfo;
        let idMapping = {};
        if (serviceInfo.relatedSchemas.outgoing) {
            serviceInfo.relatedSchemas.outgoing.forEach(_srv => {
                let ids = fetchReferenceIdsForARelation(JSON.parse(_srv.path), document);
                if (typeof ids == 'string') ids = [ids];
                if (!idMapping[_srv.service]) idMapping[_srv.service] = [];
                if (ids) idMapping[_srv.service].push({ ids: ids.filter(_d=>_d), path: flattenPath(JSON.parse(_srv.path), '') });
            });
        }
        if (serviceInfo.relatedSchemas.internal && serviceInfo.relatedSchemas.internal.users) {
            serviceInfo.relatedSchemas.internal.users.forEach(_srv => {
                let ids = fetchReferenceIdsForARelation(JSON.parse(_srv.path), document);
                if (typeof ids == 'string') ids = [ids];
                if (!idMapping['USER']) idMapping['USER'] = [];
                if (ids) idMapping['USER'].push({ ids: ids.filter(_d=>_d), path: flattenPath(JSON.parse(_srv.path), '') });
            });
        }
        let invalidPath = [];
        let promises = Object.keys(idMapping).map(_sId => {
            let idToBeValidated = [];
            idMapping[_sId].forEach(_o => {
                idToBeValidated = _.uniq(idToBeValidated.concat(_o.ids));
            })
            if (documentCache[_sId] && idToBeValidated.every(_id => documentCache[_sId].indexOf(_id) > -1)) return Promise.resolve();
            return e.getStoredServiceDetail(_sId, serviceDetailCache, req)
                .then(_sd => {
                    let _service = {}, qs = {};
                    if (_sId == 'USER') {
                        _service = { port: 80, uri: '/api/a/rbac/usr/app/${config.app}' };
                        if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
                            _service.host = "gw." + odpNS;
                        } else {
                            _service.host = 9080
                            _service.host = "localhost";
                        }
                    } else {
                        _service = { port: 80, uri: "/api/c/" + _sd.app + _sd.api };
                        if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
                            _service.host = "gw." + odpNS;
                        } else {
                            _service.port = 9080;
                            _service.host = "localhost";
                        }
                    }
                    qs = {
                        "filter": JSON.stringify({ _id: { $in: idToBeValidated } }),
                        "select": '_id',
                        "count": -1
                    }
                    if (idToBeValidated && idToBeValidated.length > 0) {
                        return e.crudDocuments(_service, "get", null, qs, req);
                    } else {
                        return Promise.resolve([]);
                    }
                })
                .then(_docs => {
                    let validIds = _docs.map(_d => _d._id);
                    if (!documentCache[_sId]) documentCache[_sId] = [];
                    documentCache[_sId] = _.uniq(documentCache[_sId].concat(validIds));
                    idMapping[_sId].forEach(_o => {
                        let invalidObj = _o.ids.find(_i => validIds.indexOf(_i) == -1);
                        if (invalidObj) invalidPath.push(_o.path);
                    });
                });
        });
        return Promise.all(promises)
            .then(() => {
                if (invalidPath.length > 0) {
                    throw new Error('Invalid external Ids at path ' + invalidPath)
                }
                return document;
            })
    }

    function getUserDocumentsFromUM(qs, req) {
        var options = {
            url: "${envConfig.baseUrlUSR}/usr",
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            qs: qs,
            json: true
        };
        return new Promise((resolve, reject) => {
            request.get(options, function (err, res, body) {
                if (err) {
                    logger.error("Error requesting user management")
                    logger.error(err.message);
                    reject(err);
                } else if (!res) {
                    logger.error("user management down");
                    reject(new Error("user management down"));
                } else {
                    if (res.statusCode === 200) {
                        resolve(body);
                    } else {
                        logger.debug(JSON.stringify(body))
                        reject(new Error("User API failed"));
                    }
                }
            });
        });
    }


    let createOnlyFields = '${config.createOnlyFields}'.split(',');

    function checkCreateOnlyField(data, nestedKey){
        let keys = nestedKey.split('.');
        let val = keys.reduce((acc, curr, i) => acc ? acc[curr] : undefined, data);
        if(val === undefined){
            return true;
        }else{
            return false;
        }
    }

    function checkEqualCreateOnly(a, b){
        if((a != null && typeof a == 'object') || ( b != null && typeof b == 'object')){
            if((a && a._id && a._href) || (b && b._id && b._href)){
                return a && b && a._id === b._id;
            }else{
                return _.isEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
            }    
        }else{
            return a == b;
        }
        
    }

    function checkCreateOnlyFieldOldData(oldData, newData, nestedKey){
        let keys = nestedKey.split('.');
        let oldVal = keys.reduce((acc, curr, i) => acc ? acc[curr] : null, oldData);
        let newVal = keys.reduce((acc, curr, i) => acc ? acc[curr] : null, newData);
        return checkEqualCreateOnly(oldVal, newVal);
        // if(newVal != oldVal){
        //     return false;
        // }else{
        //     return true;
        // }
    }

    function schemaValidation(data, operation) {
        let model = mongoose.model('${config.collectionName}');
        let modelData = new model(data);
        if(operation === 'PUT'){ 
            if(data._id){
                let id = data._id;
                return model.findOne({_id:id})
                .then(_d=>{
                    if(_d){
                        Object.assign(_d, data);
                        logger.debug(JSON.stringify({_d}));
                        return _d.validate();
                    }else{
                        modelData.isNew = false;
                        return modelData.validate();
                    }
                })
            }
            modelData.isNew = false;
        }
        logger.debug(JSON.stringify({modelData}));
        return modelData.validate();
    }
    
  
    function castType(rawDoc){
        let model = mongoose.model('${config.collectionName}');
        let doc = new model(rawDoc);
        return doc.toObject();
    }

    // function checkForCreateOnlySecuredFields(_d) {
    //     let createOnlySecuredFields = [];
    //     createOnlyFields.forEach(coField => {
    //         if (secureFields.includes(coField))
    //             createOnlySecuredFields.push(coField);
    //     });
    //     if (createOnlySecuredFields && createOnlySecuredFields.length) {
    //         return createOnlySecuredFields.reduce((acc, curr) => {
    //             return acc.then(doc => decryptData(doc, curr));
    //         }, Promise.resolve(_d));
    //     } else {
    //         return Promise.resolve(_d)
    //     }
    // }

    function allValidation(data, serviceDetail, idList, generateId, _req, operation) {
        if (data._id && idList.indexOf(data._id) > -1) return { _id: data._id, _error: 'Id already present in payload' };
        data = castType(data);
        let preHookData = null;
        if (data._id) {
            idList.push(data._id);
        }
        let idGenPromise = Promise.resolve(data);
        if(!data._id && generateId){
            idGenPromise = cuti.counter.generateId(${prefix},"${modelName}",${suffix},${padding},${counter})
                            .then(id=>{
                                data._id = id;
                                return data;
                            })
        }
        let promise = idGenPromise;
        let oldData = null;
        let model = mongoose.model('${config.collectionName}');
        if(data._id && operation == 'PUT'){
            promise = model.findOne({_id: data._id}).lean(true)
                        .then(_d=>{
                            oldData = JSON.parse(JSON.stringify(_d));
                            return Object.assign(JSON.parse(JSON.stringify(_d)), data);
                        })
        }
        return promise
            .then(_d => e.enrichDataWithPreHooks(_d, _req, operation))
            .then(_d => {
                preHookData = _d;
                return schemaValidation(JSON.parse(JSON.stringify(preHookData)), operation);
            })
            .then(() => {
                if(operation === 'PUT' || operation === 'POST')
                    return e.validateUniqueFields(preHookData, model, !oldData);
            })
            .then(()=> e.validateReferenceIds(preHookData, {}, {}, _req))
            .then(async (_d)=>{
                if(operation === 'PUT'){
                    let flag = createOnlyFields.reduce((acc, curr)=> acc && checkCreateOnlyFieldOldData(oldData, _d, curr), true);
                    if(!flag) throw new Error('Cannot edit non editable fields');
                    // _d = await checkForCreateOnlySecuredFields(_d);
                }
                if(_d) delete _d._metadata;
                if(!_d._id && generateId){
                    return cuti.counter.generateId(${prefix},"${modelName}",${suffix},${padding},${counter})
                    .then(id=>{
                        _d._id = id;
                        return _d;
                    })
                }else{
                    return _d;
                }
            })
            .catch(err => {
                let ob = { _error: err.message, message: err.message};
                if (preHookData && preHookData._id) ob._id = preHookData._id;
                return ob;
            })
    }

    function getFieldValue(obj, key) {
        let keyArr = key.split('.');
        return keyArr.reduce((acc, curr, i) => {
            if (!acc) return null;
            return acc[curr];
        }, obj);
    }

    e.validateUniqueFields = function (data, model, isNew) {
        if (uniqueFields.length == 0) return Promise.resolve();
        let filter = {}, valMapping = {}, orFilter = [];
        uniqueFields.forEach(_k => {
            let val = getFieldValue(data, _k);
            valMapping[_k] = val;
            orFilter.push({ [_k]: val });
        });
        if (Object.keys(valMapping).length == 0) return Promise.resolve();
        if (!isNew) {
            filter = { $and: [{ _id: { $ne: data._id } }, { $or: orFilter }] };
        } else {
            filter = { $or: orFilter };
            if (data._id) {
                filter['$or'].push({ _id: data._id })
            }
        }
        return model.findOne(filter).collation({ locale: "en", strength: 2 }).lean(true)
            .then(_d => {
                if (_d) {
                    let errorFields = [];
                    uniqueFields.forEach(_k => {
                        if (valMapping[_k] != undefined) {
                            let val = getFieldValue(_d, _k);
                            if (typeof val == 'string' && valMapping[_k].toLowerCase() == val.toLowerCase() || typeof val == 'number') {
                                errorFields.push(_k);
                            }
                        }
                    });
                    if(isNew && data._id && data._id.toLowerCase() === _d._id.toLowerCase())errorFields.unshift('_id'); 
                    if (errorFields.length > 0) throw new Error('Unique check validation failed for ' + errorFields);
                }
                return Promise.resolve();
            })
    }
    
    e.simulateDocs = function(dataArr, generateId, _req, operation) {
        let serviceDetail = null;
        let idList = [];
        let wasArray = false;
        if(Array.isArray(dataArr)){
            wasArray = true;
        }else{
            dataArr = [dataArr];
        }
        return e.getServiceDetail(serviceId, _req)
            .then(_sd => {
                serviceDetail = _sd;
                let promises = dataArr.map(_d => allValidation(_d, serviceDetail, idList, generateId, _req, operation));
                return Promise.all(promises);
            })
            .then(docs => {
                if (docs) {
                    docs = docs.filter(_d => _d);
                    if(!wasArray) return docs[0];
                    return docs;
                }
            })
    }

    e.getDefinition  = function(){
        return ${JSON.stringify(config.definitionWithId)};
    }

    e.checkLiveness = ()=>{
        return function (req, res, next) {
            if (global.status == "Maintenance" && !(req.path.endsWith('/health/live'))){
                res.status(503).json({});
            }
            else{
                next()
            }
        }
    }


    e.bulkDelete = function (relatedService) {
        let document = null;
        const DELETEBATCH = 30;
        let rmDocs = [];
        let ids = [];    
        return mongoose.connection.db.collection('${config.collectionName}').find({}).toArray()
            .then(docs => {
                let arr = [];
                docs.map(doc => ids.push(doc._id));
                let totalBatches = docs.length / DELETEBATCH;
                for (let i = 0; i < totalBatches; i++) {
                    arr.push(i);
                }
                let promise = arr.reduce((_p, curr, i) => {
                    return _p
                        .then(() => {
                            let doc = docs.slice(i * DELETEBATCH, (i + 1) * DELETEBATCH);                        
                            let removePromise = doc.map(doc => removeDocument(doc, relatedService));
                            return Promise.all(removePromise);
                        })
                        .then(data => {
                            data.map(doc => rmDocs.push(doc));
                        })
                }, Promise.resolve());
            })
            .then(()=>{
                var options = {
                    url: "${envConfig.baseUrlSM}/service/" + (process.env.SERVICE_ID || '${config._id}') + "/statusChangeFromMaintenance",
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    json: true
                };
                return new Promise((resolve, reject) => {
                    request.put(options, function (err, res, body) {
                        if (err) {
                            logger.error("Error requesting service-manager")
                            logger.error(err.message);
                            reject(err);
                        } else if (!res) {
                            logger.error("brahma-service-manager service down");
                            reject(new Error("brahma-service-manager service down"));
                        } else {
                            if (res.statusCode === 200) {
                                resolve(body);
                            } else {
                                reject(new Error("Service not found"));
                            }
                        }
                    });
                });
            })
            .catch(err => {
                return err;
            });
    }
    
    function removeDocument(doc, relatedService) {
        return checkRelation(relatedService, doc)
            .then(data => {
                if(data.allowed){
                    return posthook(data)
                    .then(()=>{
                        return mongoose.connection.db.collection('${config.collectionName}').remove({ _id: doc._id })
                    })
                    .then(()=>{
                        return removeAudit(doc);
                    })
                }  
            })
    }
    
    function getRelationCheckObj(obj) {
            return mongoose.connection.db.collection(obj.app).find(JSON.parse(obj.filter)).toArray()
            .then(data=>{
                let retObj = JSON.parse(JSON.stringify(obj));
                retObj.documents = data;
                return retObj;
            })
    }
    
    function checkRelation(relatedServices, doc) {
        let promiseArr = [];
        let inService = [];
        let result = {'allowed':true,'relObj':{},id:doc._id};  
        relatedServices.forEach(relatedService => {
            let urlSplit = relatedService.uri.split('/')[2];
            relatedService.app = urlSplit.split('?')[0];
            let filter = urlSplit.split('?')[1].split('=')[1];
            relatedService.filter = filter.replace('{{id}}', doc._id);
            inService.push(relatedService);
            promiseArr.push(getRelationCheckObj(relatedService));
        });
        return Promise.all(promiseArr)
            .then((_relObj)=>{
                result.relObj = _relObj;
                if(_relObj && _relObj.length === inService.length){
                    _relObj.forEach(_o => {
                        if(_o.documents.length !== 0 && _o.isRequired){
                            result.allowed= false;
                        }
                    });
                } else{
                    result.allowed = false;
                }
                return result;
            })
    }

    function posthook(data) {       
        let updateList = [];
        let promise = [];
        data.relObj.forEach(_o => {
            _o.documents.forEach(_oDoc => {
                let filter = _o.uri.split("?")[1].split("filter=")[1].split('&')[0];
                filter = JSON.parse(_o.filter);
                let srvcId = Object.values(filter)[0]
                let ulObj = updateList.find(_ul => _ul.serviceId === _o.service && _ul.doc._id === _oDoc._id);
                if (ulObj) {
                    ulObj.doc = e.generateDocumentObj(filter, ulObj.doc, data.id);
                } else {
                    updateList.push({ serviceId: _o.service, doc: e.generateDocumentObj(filter, _oDoc, data.id), app:_o.app});
                }
            })
        })
        updateList.forEach(ulObj => {
            let id = ulObj.doc._id;
            delete ulObj.doc._id;
            promise.push(mongoose.connection.db.collection(ulObj.app).findOneAndUpdate({"_id":id},{ $set: ulObj.doc}, {upsert:true}));
        })
        return Promise.all(promise);
    }

    function getPathFromFilter(filter, path) {
        if (typeof filter == 'string') {
            return path;
        }
        let key = Object.keys(filter)[0];
        if (key == '_id') return path;
        if (key == '$elemMatch') return getPathFromFilter(filter[key], path);
        else return getPathFromFilter(filter[key], path == '' ? key : (path + \`.\${key}\`));
    }
    
    function removeExtIds(path, doc, id) {
        let pathArr = path.split('.');
        let key = pathArr.shift();
        if (!doc || !doc[key]) return doc;
        if (pathArr.length == 0) {
            if (Array.isArray(doc[key])) {
                doc[key] = doc[key].filter(_d => _d._id != id);
            } else {
                if (doc[key] && doc[key]._id == id)
                    doc[key] = null;
            }
        } else {
            if (Array.isArray(doc[key])) {
                doc[key] = doc[key].map(_d => removeExtIds(pathArr.join('.'), _d, id));
            }
            doc[key] = removeExtIds(pathArr.join('.'), doc[key], id);
        }
        return doc;
    }
    
    e.generateDocumentObj = function(filter, obj, docId) {
        let path = getPathFromFilter(filter, '');
        if(path.substr(-4) == '._id') path = path.substr(0,path.length-4);
        return removeExtIds(path, obj, docId);
    }

    
    function removeAudit(doc){
    let auditData = {};
    auditData.id = doc._id;
    auditData.colName = "${config.collectionName}.audit";
    client.publish('auditQueueRemove',JSON.stringify(auditData))
};

    let secureFields = '${config.secureFields}'.split(',');

    function encryptSecureData(d) {
        var options = {
            url: '${envConfig.baseUrlSEC}/enc/${config.app}/encrypt',
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: { data: d },
            json: true
        };
        return new Promise((resolve, reject) => {
            request.post(options, function (err, res, body) {
                if (err) {
                    logger.error("Error requesting Security service");
                    reject(err);
                } else if (!res) {
                    logger.error("Security service down");
                    reject(new Error('Security service down'));
                }
                else {
                    if (res.statusCode === 200) {
                        let obj = {
                            //value: d,
                            value: body.data,
                            checksum: crypto.createHash('md5').update(d).digest("hex")
                        };
                        resolve(obj);
                    } else {
                        logger.error('Error encrypting text');
                        logger.debug('Returning previous value ' + d);
                        resolve({ value: d });
                        // reject(new Error('Error encrypting text'))
                    }
                }
            });
        })
    }

    function decryptText(d) {
        var options = {
            url: '${envConfig.baseUrlSEC}/enc/${config.app}/decrypt',
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: { data: d },
            json: true
        };
        return new Promise((resolve, reject) => {
            request.post(options, function (err, res, body) {
                if (err) {
                    logger.error("Error requesting Security service for value " + d);
                    logger.error("Error::: ", err);
                    reject(err);
                } else if (!res) {
                    logger.error("Security service down");
                    reject(new Error('Security service down'));
                }
                else {
                    if (res.statusCode === 200) {
                        resolve(body.data);
                    } else {
                        logger.error('Error in decrypting text ', d)
                        logger.error('Error in decrypting text ', res.statusCode)
                        logger.error('Error in decrypting text ', res.body)
                        reject(new Error('Error encrypting text'))
                    }
                }
            });
        })
    }

    function getData(filter, page, count) {
        page = (page === 0) ? 0 : page * count;
        return mongoose.connection.db.collection('${config.collectionName}').find(filter).skip(page).limit(count).toArray();
    }

    function fixData(data, field) {
        let keys = field.split('.');
        if(keys.length == 1){
            if (data[keys[0]]) {
                if (Array.isArray(data[keys[0]])) {
                    let promises = data[keys[0]].map(_d => {
                        if(typeof _d == 'string')
                            return encryptSecureData(_d)
                        else 
                            return Promise.resolve(_d)});
                    return Promise.all(promises)
                    .then(_d => {
                        data[keys[0]] = _d;
                        return data;
                    })
                    .catch(err=>{
                        logger.error(err);
                        return data;
                    })
                }else{
                    if(typeof data[keys[0]] == 'string') {
                        return encryptSecureData(data[keys[0]])
                        .then(_d => {
                            data[keys[0]] = _d;
                            return data;
                        })
                        .catch(err=>{
                            logger.error(err);
                            return data;
                        })
                    } else {
                        return Promise.resolve(data)
                    }
                }
            } else {
                return Promise.resolve(data);
            }
        }
        else{
            if (data[keys[0]]) {
                let ele = keys.shift();
                let newNestedKey = keys.join('.');
                if (Array.isArray(data[ele])) {
                    let promises = data[ele].map(_d => fixData(_d, newNestedKey));
                    return Promise.all(promises)
                    .then(_d => {
                        data[ele] = _d;
                        return data;
                    })
                }
                return fixData(data[ele], newNestedKey).then(() => data);
            }  else {
                return Promise.resolve(data);
            }
        }
    }

    function updateData(model, field, data) {
        // checking for all secure fields of a record at once
        let promise = secureFields.reduce((acc, curr)=>{
            return acc.then(_d=>fixData(_d, curr));
        }, Promise.resolve(data));

        return promise.then(() => {
            let id = data._id;
            return model.update({_id :id}, data); 
        }).catch(e => {
            logger.error('error in updating record ' + data._id + ' : ', e);
            return Promise.resolve();
        })
        // return fixData(field, data)
        //     .then(() => {
        //         let id = data._id;
        //         var obj = getSetterObj(field, data);
        //         return model.update({_id :id}, {$set: obj});
        //     })
            // .catch(e => {
            //     logger.error('error in updating field: ', e);
            //     return Promise.resolve();
            // })
    }

    function fixForField(field) {
        let model = mongoose.model('${config.collectionName}');
        let filter = { $and: [{ [field]: { $exists: true } }, { [field]: { $ne: null } }, { [field]: { $ne: [] } }, { [\`\${field}.value\`]: { $exists: false } }] };
        let updatedArr = [];
        return model.count(filter)
            .then((count) => {
                logger.debug('Documents found to be fixed for secureText field '+ field +' ' + count);
                let batchSize = 100;
                let totalBatches = count / batchSize;
                let arr = [];
                for (let i = 0; i < totalBatches; i++) {
                    arr.push(i);
                }
                return arr.reduce((_p, curr) => {
                    return _p
                        .then(() => {
                            return getData(filter, curr, batchSize);
                        })
                        .then(_data => _data.map(_d => updateData(model, field, _d)))
                        .then(_updatePromises => Promise.all(_updatePromises))
                }, Promise.resolve());
            });
    }

    e.fixSecureText = function () {
        logger.debug('Fixing Secure Text');
        logger.debug('Fields found '+secureFields);
        return secureFields.reduce((acc, curr) => {
            return acc.then(() => {
                return fixForField(curr);
            })
        }, Promise.resolve());
    }

    function decryptData(data, nestedKey, forFile) {
        let keys = nestedKey.split('.');
        if (keys.length == 1) {
            if (data[keys[0]]) {
                if (Array.isArray(data[keys[0]])) {
                    let promises = data[keys[0]].map(_d => {
                        return decryptText(_d.value)
                            .then(_decrypted => {
                                if(forFile)
                                    _d = _decrypted;
                                else
                                    _d.value = _decrypted;
                                return _d;
                            });
                    });
                    return Promise.all(promises)
                        .then(_d => {
                            data[keys[0]] = _d;
                            return data;
                        });
                } else if (data[keys[0]] && typeof data[keys[0]].value == 'string') {
                    return decryptText(data[keys[0]].value)
                        .then(_d => {
                            if(forFile)
                                data[keys[0]] = _d;
                            else
                                data[keys[0]].value = _d;
                            return data;
                        });
                }
            } else {
                return Promise.resolve(data);
            }
        } else {
            if (data[keys[0]]) {
                let ele = keys.shift();
                let newNestedKey = keys.join('.');
                if (Array.isArray(data[ele])) {
                    let promises = data[ele].map(_d => decryptData(_d, newNestedKey, forFile));
                    return Promise.all(promises)
                        .then(_d => {
                            data[ele] = _d;
                            return data;
                        });
                }
                return decryptData(data[ele], newNestedKey, forFile).then(() => data);
            } else {
                return Promise.resolve(data);
            }
        }
    }
    
    e.decryptArrData = async function (data, nestedKey, forFile) {
        let promises = data.map(_d => decryptData(_d, nestedKey, forFile));
        return Promise.all(promises);
    }

    e.isWorkflowEnabledForUser = (_req) => {
        let usrId = _req.get('User');
        logger.debug('Checking WF for User::: ', usrId);
        return new Promise((resolve, reject) => {
            const options = {
                url: "${envConfig.baseUrlUSR}/usr/reviewpermissionservice/" + serviceId + "?user=" + usrId,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'TxnId': _req.get('txnId'),
                    'Authorization': _req.get('Authorization'),
                    'User': usrId
                },
                json: true
            };
            request(options, (_err, _res, _body) => {
                if (_err) {
                    reject(_err);
                } else {
                    logger.debug('reviewpermissionservice:: ', _body)
                    if (_res.statusCode == 404) return resolve(false);
                    return resolve(true);
                }
            });
        });
    };

    e.getExistingWorkflowIdsForDS = (_req) => {
        let queryParams = {
            filter: {
            serviceId : serviceId,
            app : "${config.app}",
            status : "Pending"
            },
            select : "documentId"
        }
        return new Promise((resolve, reject) => {
            const options = {
                url: "${envConfig.baseUrlWF}",
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'TxnId': _req.get('txnId'),
                    'Authorization': _req.get('Authorization'),
                    'User': _req.get('User')
                },
                json: true,
                qs : queryParams
            };
            request(options, (_err, _res, _body) => {
                if (_err) {
                    reject(_err);
                } else {
                    if (_res.statusCode == 200) {
                        logger.debug('wf resposne:: ', _body);
                        let wfIds = _body.map(wfItem => wfItem.documentId);
                        resolve(wfIds);
                    } else {
                        logger.error('response status code getExistingWorkflowIdsForDS:: ', _res.statusCode);
                        resolve([]);
                    }
                }
            });
        });
    };

    module.exports = e;
    `;
}

module.exports.helperUtil = helperUtil;