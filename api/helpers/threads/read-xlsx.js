const { parentPort, workerData } = require('worker_threads');
const XLSX = require('xlsx');
const { ObjectUtils } = require('@appveen/json-utils');
const _ = require('lodash');

const fileTransferId = workerData.fileTransferId;
const app = workerData.app;
const tempFilePath = workerData.tempFilePath;

(async () => {
    try {
        const workBook = XLSX.readFile(tempFilePath);
        let promises = workBook.SheetNames.map(async (sheet) => {
            const result = {};
            try {
                const dataService = {};
                dataService.name = sheet;
                dataService.app = app;
                const sheetBoook = workBook.Sheets[sheet];
                let records = XLSX.utils.sheet_to_json(sheetBoook, { blankrows: false });
                records = records.map(ObjectUtils.unFlatten);
                const json = records[0];
                dataService.definition = convertToDefinition(json);
                dataService.fileId = fileTransferId;

                records = records.map((row) => {
                    const temp = _.cloneDeep(dataService);
                    temp.data = row;
                    temp.status = 'Pending';
                    return temp;
                });
                result.statusCode = 200;
                result.body = { name: sheet, records };
            } catch (err) {
                result.statusCode = 400;
                result.body = err;
            }
            return result;
        });
        promises = await Promise.all(promises);
        parentPort.postMessage(promises);
    } catch (err) {
        throw err;
    }
})();


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