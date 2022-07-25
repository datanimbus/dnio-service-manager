const XLSX = require('xlsx');
const _ = require('lodash');
const { ObjectUtils } = require('@appveen/json-utils');
const mongoose = require('mongoose');

async function readFileForDataService(req) {
    const servciceModel = mongoose.model('services');
    const importModel = mongoose.model('service-imports');
    const app = req.params.app;
    const workBook = XLSX.readFile(req.files.file.tempFilePath);
    let promises = workBook.SheetNames.map(async (sheet) => {
        const result = {};
        try {
            const dataService = {};
            dataService.name = sheet;
            dataService.app = req.params.app;

            const sheetBoook = workBook.Sheets[sheet];
            let records = XLSX.utils.sheet_to_json(sheetBoook, { blankrows: false });
            records = records.map(ObjectUtils.unFlatten);
            const json = records[0];
            dataService.definition = convertToDefinition(json);

            // Creating Data Service Doc
            const doc = new servciceModel(dataService);
            const status = await doc.save(req);
            result.statusCode = 200;
            result.body = status;

            // Inserting Records into temp collection
            records = records.map(row => {
                const temp = {};
                temp.data = row;
                temp.app = app;
                temp.serviceId = status._id;
                temp.status = 'Pending';
                return temp;
            });
            const dataDoc = new importModel(records);
            await dataDoc.save(req);

        } catch (err) {
            result.statusCode = 400;
            result.body = err;
        }
        return result;
    });
    return await Promise.all(promises);
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