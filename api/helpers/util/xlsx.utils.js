const path = require('path');
const { Worker } = require('worker_threads');
const mongoose = require('mongoose');

async function readFileForDataService(req, fileTransferId) {
    const importModel = mongoose.model('service-imports');

    const promise = new Promise((resolve, reject) => {
        const wt = new Worker(path.join(__dirname, '../threads/read-xlsx.js'), {
            workerData: {
                fileTransferId,
                app: req.params.app,
                tempFilePath: req.files.file.tempFilePath
            }
        });
        wt.on('message', function (data) {
            resolve(data);
        });
        wt.on('error', function (data) {
            reject(data);
        });
    });
    const data = await promise;
    const results = [];
    await data.reduce(async (prev, result) => {
        results.push({ statusCode: result.statusCode, body: { name: result.body.name, count: result.body.records.length } });
        await prev;
        let p = result.body.records.map(async (row) => {
            const dataDoc = new importModel(row);
            return await dataDoc.save(req);
        });
        return Promise.all(p);
    }, Promise.resolve());

    return results;
}


function convertToDefinition(json, parentKey) {
    const definitions = [];
    if (json) {
        Object.keys(json).forEach(key => {
            let temp = {};
            const tempKey = _.camelCase(key);
            temp.key = tempKey;
            temp.properties = {
                name: _.startCase(key),
                dataPath: parentKey ? parentKey + '.' + tempKey : tempKey
            };
            if (json[key]) {
                temp.type = _.capitalize(typeof json[key]);
            } else {
                temp.type = 'String';
            }
            if (json[key] && typeof json[key] == 'object') {
                temp.type = _.capitalize(typeof json[key]);
                temp.definition = convertToDefinition(json[key], tempKey);
            }
            definitions.push(temp);
        });
    }
    return definitions;
}


module.exports.readFileForDataService = readFileForDataService;