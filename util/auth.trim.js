const _ = require('lodash');


function trimData(req, data) {
    if (!data || req.user.skipPermissionCheck) {
        return;
    }
    if (req.user.appPermissions.indexOf('PMDSD') == -1 && ['definition'].some(key => _.has(req.body, key))) {
        _.unset(data, 'definition');
    }

    if (req.user.appPermissions.indexOf('PMDSI') == -1 && ['webHooks', 'preHooks', 'postHooks'].some(key => _.has(req.body, key))) {
        _.unset(data, 'webHooks');
        _.unset(data, 'preHooks');
        _.unset(data, 'postHooks');
    }

    if (req.user.appPermissions.indexOf('PMDSE') == -1 && ['wizard', 'stateModel'].some(key => _.has(req.body, key))) {
        _.unset(data, 'wizard');
        _.unset(data, 'stateModel');
    }

    if (req.user.appPermissions.indexOf('PMDSR') == -1 && ['role'].some(key => _.has(req.body, key))) {
        _.unset(data, 'role');
    }

    if (req.user.appPermissions.indexOf('PMDSS') == -1 && ['disableInsights', 'permanentDeleteData', 'api', 'versionValidity', 'headers', 'enableSearchIndex'].some(key => _.has(req.body, key))) {
        _.unset(data, 'disableInsights');
        _.unset(data, 'permanentDeleteData');
        _.unset(data, 'api');
        _.unset(data, 'versionValidity');
        _.unset(data, 'headers');
        _.unset(data, 'enableSearchIndex');
    }
}

module.exports.trimData = trimData;