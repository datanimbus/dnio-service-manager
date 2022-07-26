const XLSX = require('xlsx');
const _ = require('lodash');
const { ObjectUtils } = require('@appveen/json-utils');
const mongoose = require('mongoose');

async function readFileForDataService(req, fileTransferId) {
    const importModel = mongoose.model('service-imports');
    const workBook = XLSX.readFile(req.files.file.tempFilePath);
    let promises = workBook.SheetNames.map(async (sheet) => {
        const result = {};
        try {
            const dataService = {};
            dataService.name = sheet;
            const sheetBoook = workBook.Sheets[sheet];
            let records = XLSX.utils.sheet_to_json(sheetBoook, { blankrows: false });
            records = records.map(ObjectUtils.unFlatten);
            const json = records[0];
            dataService.definition = convertToDefinition(json);
            dataService.fileId = fileTransferId;

            records = records.map(row => {
                const temp = _.cloneDeep(dataService);
                temp.data = row;
                temp.status = 'Pending';
                return temp;
            });
            const dataDoc = new importModel(records);
            await dataDoc.save(req);
            result.statusCode = 200;
            result.body = { name: sheet, count: records.length };
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