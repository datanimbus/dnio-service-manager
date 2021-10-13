const router = require('express').Router();
const { AuthCacheMW } = require('@appveen/ds-auth-cache');
const _ = require('lodash');
const config = require('../config/config');

const logger = global.logger;

const permittedUrls = [
    "/sm/health/live",
    "/sm/health/ready",
    "/service/{id}/statusChange",
    "/service/{id}/statusChangeFromMaintenance",
    "/service/{id}/checkUnique"
];

router.use(AuthCacheMW({ permittedUrls, secret: config.TOKEN_SECRET, decodeOnly: true }));

router.use((req, res, next) => {
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
    if (req.user.isSuperAdmin || (req.user.apps && req.user.apps.indexOf(req.locals.app) > -1)) {
        req.locals.skipPermissionCheck = true;
    }
    if (req.locals.app) {
        req.user.appPermissions = req.user.allPermissions.find(e => e.app === req.locals.app) || [];
    } else {
        req.user.appPermissions = [];
    }
    next();
});

router.use(['/sm/service', '/sm/service/.*', '/:id/draftDelete', '/:id/purge/all', '/:id/purge/:type', '/:id/count', '/:id/:app/idCount', '/calendar]enable', '/calendar/disable', '/logs', '/:id/lockDocument/count', '/tags'], async (req, res, next) => {
    if (req.locals.skipPermissionCheck) {
        return next();
    }
    if (!req.user.appPermissions.some(e => e.startsWith('PMDS') || e.startsWith('PVDS'))) {
        return res.status(403).json({ message: 'You don\'t have access for this API' });
    }
    if (!req.user.appPermissions.indexOf('PMDSD') && ['_id', 'app', 'definition', 'draftVersion'].some(key => _.has(req.body, key))) {
        return res.status(403).json({ message: 'You don\'t have access for Design' });
    }

    if (!req.user.appPermissions.indexOf('PMDSI') && ['app', 'webHooks', 'preHooks', 'postHooks'].some(key => _.has(req.body, key))) {
        return res.status(403).json({ message: 'You don\'t have access for Integration' });
    }

    if (!req.user.appPermissions.indexOf('PMDSE') && ['app', 'wizard', 'stateModel'].some(key => _.has(req.body, key))) {
        return res.status(403).json({ message: 'You don\'t have access for Experience' });
    }

    if (!req.user.appPermissions.indexOf('PMDSR') && ['app', 'role'].some(key => _.has(req.body, key))) {
        return res.status(403).json({ message: 'You don\'t have access for Roles' });
    }

    if (!req.user.appPermissions.indexOf('PMDSS') && ['disableInsights', 'permanentDeleteData', 'app', 'api', 'versionValidity', 'headers', 'enableSearchIndex'].some(key => _.has(req.body, key))) {
        return res.status(403).json({ message: 'You don\'t have access for Settings' });
    }
    const temp = res.end;
    res.end = function (data) {
        temp(data);
    };
    next();
});

router.use(['/:id/start', '/:id/stop', '/:id/deploy', '/:id/repair'], async (req, res, next) => {
    if (req.locals.skipPermissionCheck) {
        return next();
    }
    if (!req.user.appPermissions.some(e => e.startsWith('PMDSP'))) {
        return res.status(403).json({ message: 'You don\'t have access for this API' });
    }
    next();
});

router.use('/sm/globalSchema', async (req, res, next) => {
    if (req.locals.skipPermissionCheck) {
        return next();
    }
    if (!req.user.appPermissions.some(e => e.startsWith('PML') || e.startsWith('PVL'))) {
        return res.status(403).json({ message: 'You don\'t have access for this API' });
    }
    next();
});

router.use([
    '/validateUserDeletion/:app/:userId',
    '/userDeletion/:app/:userId'
], async (req, res, next) => {
    if (req.locals.skipPermissionCheck) {
        return next();
    }
    if (!req.user.appPermissions.some(e => e.startsWith('PMU') || e.startsWith('PVU') || e.startsWith('PMB') || e.startsWith('PVB'))) {
        return res.status(403).json({ message: 'You don\'t have access for this API' });
    }
    next();
});

router.use(['/sm/:app/service/.*'], async (req, res, next) => {
    //Check is User is App Admin
    if (req.locals.skipPermissionCheck) {
        return next();
    }
    res.status(403).json({ message: 'You don\'t have access for this API' });
});

router.use(['/sm/app/:app'], async (req, res, next) => {
    //Check is User is Super Admin
    if (!req.user.isSuperAdmin) {
        return res.status(403).json({ message: 'You don\'t have access for this API' });
    }
    next();
});

module.exports = router;