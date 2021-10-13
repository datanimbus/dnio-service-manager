const router = require('express').Router();
const { AuthCacheMW } = require('@appveen/ds-auth-cache');
const _ = require('lodash');
const config = require('../config/config');

const logger = global.logger;

const permittedUrls = [
    "/api/a/rbac/login",
    "/api/a/rbac/ldap/login",
    "/api/a/rbac/azure/login",
    "/api/a/rbac/azure/login/callback",
    "/api/a/rbac/azure/userFetch/callback",
    "/api/a/rbac/authType/",
    "/api/a/rbac/closeAllSessions",
    "/gw/health/live",
    "/gw/health/ready",
    "/service/{id}/statusChange",
    "/service/{id}/statusChangeFromMaintenance",
    "/service/{id}/checkUnique"
];

router.use(AuthCacheMW({ permittedUrls, secret: config.TOKEN_SECRET, decodeOnly: true }));

router.use((req, res, next) => {
    if (req.params.app) {
        return next();
    }
    if (req.query.app) {
        req.params.app = req.query.app;
    } else if (req.query.filter) {
        let filter = req.query.filter;
        if (typeof filter === 'string') {
            filter = JSON.parse(filter);
        }
        req.params.app = filter.app;
    } else if (req.body.app) {
        req.params.app = req.body.app;
    }
    next();
});

router.use(['/sm/service', '/sm/service/.*', '/:id/draftDelete', '/:id/purge/all', '/:id/purge/:type', '/:id/count', '/:id/:app/idCount', '/calendar]enable', '/calendar/disable', '/logs', '/:id/lockDocument/count', '/tags'], async (req, res, next) => {
    if (req.user.isSuperAdmin || (req.user.apps && req.user.apps.indexOf(req.params.app) == -1)) {
        return next();
    }
    if (!req.user.permissions.some(e => e.startsWith('PMDS') || e.startsWith('PVDS'))) {
        return res.status(403).json({ message: 'You don\'t have access for this API' });
    }
    if (!req.user.permissions.indexOf('PMDSD') && ['_id', 'app', 'definition', 'draftVersion'].some(key => _.has(req.body, key))) {
        return res.status(403).json({ message: 'You don\'t have access for Design' });
    }

    if (!req.user.permissions.indexOf('PMDSI') && ['app', 'webHooks', 'preHooks', 'postHooks'].some(key => _.has(req.body, key))) {
        return res.status(403).json({ message: 'You don\'t have access for Integration' });
    }

    if (!req.user.permissions.indexOf('PMDSE') && ['app', 'wizard', 'stateModel'].some(key => _.has(req.body, key))) {
        return res.status(403).json({ message: 'You don\'t have access for Experience' });
    }

    if (!req.user.permissions.indexOf('PMDSR') && ['app', 'role'].some(key => _.has(req.body, key))) {
        return res.status(403).json({ message: 'You don\'t have access for Roles' });
    }

    if (!req.user.permissions.indexOf('PMDSS') && ['disableInsights', 'permanentDeleteData', 'app', 'api', 'versionValidity', 'headers', 'enableSearchIndex'].some(key => _.has(req.body, key))) {
        return res.status(403).json({ message: 'You don\'t have access for Settings' });
    }
    const temp = res.end;
    res.end = function (data) {
        temp(data);
    };
    next();
});

router.use(['/:id/start', '/:id/stop', '/:id/deploy', '/:id/repair'], async (req, res, next) => {
    if (req.user.isSuperAdmin || (req.user.apps && req.user.apps.indexOf(req.params.app) == -1)) {
        return next();
    }
    if (!req.user.permissions.some(e => e.startsWith('PMDSP'))) {
        return res.status(403).json({ message: 'You don\'t have access for this API' });
    }
    next();
});

router.use('/sm/globalSchema', async (req, res, next) => {
    if (req.user.isSuperAdmin || (req.user.apps && req.user.apps.indexOf(req.params.app) == -1)) {
        return next();
    }
    if (!req.user.permissions.some(e => e.startsWith('PML') || e.startsWith('PVL'))) {
        return res.status(403).json({ message: 'You don\'t have access for this API' });
    }
    next();
});

router.use([
    '/validateUserDeletion/:app/:userId',
    '/userDeletion/:app/:userId'
], async (req, res, next) => {
    if (req.user.isSuperAdmin || (req.user.apps && req.user.apps.indexOf(req.params.app) == -1)) {
        return next();
    }
    if (!req.user.permissions.some(e => e.startsWith('PMU') || e.startsWith('PVU') || e.startsWith('PMB') || e.startsWith('PVB'))) {
        return res.status(403).json({ message: 'You don\'t have access for this API' });
    }
    next();
});

router.use(['/sm/:app/service/.*'], async (req, res, next) => {
    //Check is User is App Admin
    if (req.user.isSuperAdmin || (req.user.apps && req.user.apps.indexOf(req.params.app) == -1)) {
        return next();
    }
    if (req.user.apps && req.user.apps.indexOf(req.params.app) == -1) {
        return res.status(403).json({ message: 'You don\'t have access for this API' });
    }
    next();
});

router.use(['/sm/app/:app'], async (req, res, next) => {
    //Check is User is Super Admin
    if (!req.user.isSuperAdmin) {
        return res.status(403).json({ message: 'You don\'t have access for this API' });
    }
    next();
});

module.exports = router;