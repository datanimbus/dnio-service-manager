const router = require('express').Router();
const { AuthCacheMW } = require('@appveen/ds-auth-cache');
const _ = require('lodash');
const config = require('../config/config');

const logger = global.logger;

const permittedUrls = [
    "/sm/service/{id}/checkUnique",
    "/sm/service/verifyHook"
];

const onlyAuthUrls = [
    '/sm/service/verifyHook',
    '/sm/{id}/lockDocument/count'
];

const internalUrls = [
    '/sm/app/{app}',
    '/sm/validateUserDeletion/{app}/{userId}',
    '/sm/userDeletion/{app}/{userId}',
    '/sm/service/{id}/statusChange',
    '/sm/service/{id}/statusChangeFromMaintenance',
];

const adminOnlyUrls = [
    '/sm/calendar/enable',
    '/sm/calendar/disable',
    '/sm/{app}/service/stop ',
    '/sm/{app}/service/start ',
    '/sm/{app}/service/repair',
    '/sm/service/status/count',
];

const commonUrls = [
    '/sm/service',
    '/sm/service/{id}',
    '/sm/service/utils/{app}/{name}',
    '/sm/service/count',
    '/sm/service/audit',
    '/sm/service/audit/count',
    '/sm/{id}/draftDelete',
    '/sm/{id}/purge/all',
    '/sm/{id}/purge/{type}',
    '/sm/service/{id}/swagger',
    '/sm/service/{id}/checkUnique',
    '/sm/globalSchema',
    '/sm/globalSchema/{id}',
    '/sm/globalSchema/count',
    '/sm/globalSchema/audit',
    '/sm/globalSchema/audit/count',
    '/sm/{id}/start',
    '/sm/{id}/stop',
    '/sm/{id}/deploy',
    '/sm/{id}/repair',
    '/sm/{id}/count',
    '/sm/{id}/{app}/idCount',
    '/sm/logs',
    '/sm/tags'
];


router.use(AuthCacheMW({ permittedUrls: _.concat(permittedUrls, internalUrls), secret: config.TOKEN_SECRET, decodeOnly: true }));

router.use((req, res, next) => {
    if (!req.locals) {
        req.locals = {};
    }
    if (req.params.app) {
        req.locals.app = req.params.app;
    } else if (req.query.app) {
        req.locals.app = req.query.app;
    } else if (req.query.filter) {
        let filter = req.query.filter;
        if (typeof filter === 'string') {
            filter = JSON.parse(filter);
        }
        req.locals.app = filter.app;
    } else if (req.body.app) {
        req.locals.app = req.body.app;
    }
    // check if user is app admin or super admin

    if (req.user) {
        if (req.locals.app) {
            req.user.appPermissions = req.user.allPermissions.find(e => e.app === req.locals.app) || [];
        } else {
            req.user.appPermissions = [];
        }
        if (req.user.isSuperAdmin || (req.user.apps && req.user.apps.indexOf(req.locals.app) > -1)) {
            req.locals.skipPermissionCheck = true;
        }
    }
    next();
});

router.use((req, res, next) => {

    // Check if path required only authentication checks.
    if (onlyAuthUrls.some(e => compareURL(e, req.path))) {
        return next();
    }

    // Check if path is for internal Use.
    if (internalUrls.some(e => compareURL(e, req.path))) {
        // Some Auth check for internal URLs required.
        return next();
    }

    // Check if path is allowed only to admins and super admins.
    if (adminOnlyUrls.some(e => compareURL(e, req.path)) && req.locals.skipPermissionCheck) {
        return next();
    }

    // All these paths required permissions check.
    if (commonUrls.some(e => compareURL(e, req.path))) {
        // Pass if user is admin or super admin.
        if (req.locals.skipPermissionCheck) {
            return next();
        }

        // Check if user has permission for the path.
        if (canAccessPath(req)) {
            return next();
        }
    }
    return res.status(403).json({ message: 'You don\'t have access for this API' });
});


function compareURL(tempUrl, url) {
    let tempUrlSegment = tempUrl.split('/').filter(_d => _d != '');
    let urlSegment = url.split('/').filter(_d => _d != '');
    if (tempUrlSegment.length != urlSegment.length) return false;

    tempUrlSegment.shift();
    urlSegment.shift();

    let flag = tempUrlSegment.every((_k, i) => {
        if (_k.startsWith('{') && _k.endsWith('}') && urlSegment[i] != '') return true;
        return _k === urlSegment[i];
    });
    logger.trace(`Compare URL :: ${tempUrl}, ${url} :: ${flag}`);
    return flag;
}

function canAccessPath(req) {
    if (compareURL('/sm/service', req.path) && _.intersectionWith(req.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
        if ((req.method == 'POST' || req.method == 'PUT' || req.method == 'DELETE')) {
            if (_.intersection(req.appPermissions, ['PML']).length > 0) {
                return true;
            } else {
                return false;
            }
        }
        return true;
    }
    if (compareURL('/sm/service/{id}', req.path) && _.intersectionWith(req.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
        if ((req.method == 'POST' || req.method == 'PUT' || req.method == 'DELETE')) {
            if (_.intersection(req.appPermissions, ['PML']).length > 0) {
                return true;
            } else {
                return false;
            }
        }
        return true;
    }
    if (compareURL('/sm/service/utils/{app}/{name}', req.path) && _.intersectionWith(req.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
        return true;
    }
    if (compareURL('/sm/service/count', req.path) && _.intersectionWith(req.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
        return true;
    }
    if (compareURL('/sm/service/audit', req.path) && _.intersectionWith(req.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
        return true;
    }
    if (compareURL('/sm/service/audit/count', req.path) && _.intersectionWith(req.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
        return true;
    }
    if (compareURL('/sm/{id}/draftDelete', req.path) && _.intersectionWith(req.appPermissions, ['PMDS'], comparator).length > 0) {
        return true;
    }
    if (compareURL('/sm/{id}/purge/all', req.path) && _.intersection(req.appPermissions, ['PMDSS']).length > 0) {
        return true;
    }
    if (compareURL('/sm/{id}/purge/{type}', req.path) && _.intersection(req.appPermissions, ['PMDSS']).length > 0) {
        return true;
    }
    if (compareURL('/sm/service/{id}/swagger', req.path) && _.intersectionWith(req.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
        return true;
    }
    if (compareURL('/sm/service/{id}/checkUnique', req.path) && _.intersection(req.appPermissions, ['PMDSD', 'PVDSD']).length > 0) {
        return true;
    }
    if (compareURL('/sm/globalSchema', req.path) && _.intersection(req.appPermissions, ['PVL', 'PML']).length > 0) {
        if ((req.method == 'POST' || req.method == 'PUT' || req.method == 'DELETE')) {
            if (_.intersection(req.appPermissions, ['PML']).length > 0) {
                return true;
            } else {
                return false;
            }
        }
        return true;
    }
    if (compareURL('/sm/globalSchema/{id}', req.path) && _.intersection(req.appPermissions, ['PVL', 'PML']).length > 0) {
        if ((req.method == 'POST' || req.method == 'PUT' || req.method == 'DELETE')) {
            if (_.intersection(req.appPermissions, ['PML']).length > 0) {
                return true;
            } else {
                return false;
            }
        }
        return true;
    }
    if (compareURL('/sm/globalSchema/count', req.path) && _.intersection(req.appPermissions, ['PVL', 'PML']).length > 0) {
        return true;
    }
    if (compareURL('/sm/globalSchema/audit', req.path) && _.intersection(req.appPermissions, ['PVL', 'PML']).length > 0) {
        return true;
    }
    if (compareURL('/sm/globalSchema/audit/count', req.path) && _.intersection(req.appPermissions, ['PVL', 'PML']).length > 0) {
        return true;
    }
    if (compareURL('/sm/{id}/start', req.path) && _.intersection(req.appPermissions, ['PMDSPS']).length > 0) {
        return true;
    }
    if (compareURL('/sm/{id}/stop', req.path) && _.intersection(req.appPermissions, ['PMDSPS']).length > 0) {
        return true;
    }
    if (compareURL('/sm/{id}/deploy', req.path) && _.intersection(req.appPermissions, ['PMDSPD']).length > 0) {
        return true;
    }
    if (compareURL('/sm/{id}/repair', req.path) && _.intersection(req.appPermissions, ['PMDSPD']).length > 0) {
        return true;
    }
    if (compareURL('/sm/{id}/count', req.path) && _.intersectionWith(req.appPermissions, ['PMDS', 'PVDS'], comparator).length > 0) {
        return true;
    }
    if (compareURL('/sm/{id}/{app}/idCount', req.path) && _.intersection(req.appPermissions, ['PMDSD', 'PVDSD']).length > 0) {
        return true;
    }
    if (compareURL('/sm/logs', req.path) && _.intersection(req.appPermissions, ['PVDSA']).length > 0) {
        return true;
    }
    if (compareURL('/sm/tags', req.path) && _.intersection(req.appPermissions, ['PVDSS', 'PMDSS']).length > 0) {
        return true;
    }
    return false;
}


function comparator(main, pattern) {
    return main.startsWith(pattern);
}


router.use(['/sm/service', '/sm/service/:id'], async (req, res, next) => {
    if (req.locals.skipPermissionCheck) {
        return next();
    }
    if (req.user.appPermissions.indexOf('PMDSD') == -1 && ['_id', 'app', 'definition', 'draftVersion'].some(key => _.has(req.body, key))) {
        return res.status(403).json({ message: 'You don\'t have access for Design' });
    }

    if (req.user.appPermissions.indexOf('PMDSI') == -1 && ['app', 'webHooks', 'preHooks', 'postHooks'].some(key => _.has(req.body, key))) {
        return res.status(403).json({ message: 'You don\'t have access for Integration' });
    }

    if (req.user.appPermissions.indexOf('PMDSE') == -1 && ['app', 'wizard', 'stateModel'].some(key => _.has(req.body, key))) {
        return res.status(403).json({ message: 'You don\'t have access for Experience' });
    }

    if (req.user.appPermissions.indexOf('PMDSR') == -1 && ['app', 'role'].some(key => _.has(req.body, key))) {
        return res.status(403).json({ message: 'You don\'t have access for Roles' });
    }

    if (req.user.appPermissions.indexOf('PMDSS') == -1 && ['disableInsights', 'permanentDeleteData', 'app', 'api', 'versionValidity', 'headers', 'enableSearchIndex'].some(key => _.has(req.body, key))) {
        return res.status(403).json({ message: 'You don\'t have access for Settings' });
    }
    const temp = res.end;
    res.end = function (data) {
        temp(data);
    };
    next();
});

module.exports = router;