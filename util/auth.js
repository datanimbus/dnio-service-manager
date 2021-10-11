const crypto = require('crypto');
const JWT = require('jsonwebtoken');
const router = require('express').Router();
const AuthCache = require('@appveen/ds-auth-cache');
const _ = require('lodash');
const config = require('../config/config');

const logger = global.logger;
const cache = new AuthCache();

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

router.use(async (req, res, next) => {
    try {
        if (permittedUrls.some(_url => conpareURL(_url, req.path)) || req.path.indexOf('/health') > -1 || req.path.indexOf('/export') > -1) {
            return next();
        }

        logger.debug(`[${req.header('txnId')}] Validating token format`);
        let token = req.header('authorization');

        if (!token) {
            logger.debug(`[${req.header('txnId')}] No token found in 'authorization' header`);
            logger.debug(`[${req.header('txnId')}] Checking for 'authorization' token in cookie`);
            token = req.cookies.Authorization;
        }

        if (!token) return res.status(401).json({ message: 'Unauthorized' });

        token = token.split('JWT ')[1];
        const user = JWT.verify(token, config.TOKEN_SECRET, { ignoreExpiration: true });
        if (!user) {
            logger.error(`[${req.header('txnId')}] Invalid JWT format`);
            return res.status(401).json({ 'message': 'Unauthorized' });
        }
        let tokenHash = md5(token);
        logger.debug(`[${req.header('txnId')}] Token hash :: ${tokenHash}`);
        req.tokenHash = tokenHash;
        req.user = typeof user === 'string' ? JSON.parse(user) : user;
        logger.trace(`[${req.header('txnId')}] Token Data : ${JSON.stringify(req.user)}`);

        // Fetching from Redis Cache
        const permissions = await cache.getUserPermissions(req.user._id);
        req.user.permissions = permissions || [];
        next();
    } catch (err) {
        logger.err('[Auth]', err);
        res.status(500).json({ message: err.message });
    }
});

router.use(['/sm/service', '/sm/service/.*', '/:id/draftDelete', '/:id/purge/all', '/:id/purge/:type', '/:id/count', '/:id/:app/idCount', '/calendar]enable', '/calendar/disable', '/logs', '/:id/lockDocument/count', '/tags'], async (req, res, next) => {
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
    if (!req.user.permissions.some(e => e.startsWith('PMDSP'))) {
        return res.status(403).json({ message: 'You don\'t have access for this API' });
    }
    next();
});

router.use('/sm/globalSchema', async (req, res, next) => {
    if (!req.user.permissions.some(e => e.startsWith('PML') || e.startsWith('PVL'))) {
        return res.status(403).json({ message: 'You don\'t have access for this API' });
    }
    next();
});

router.use([
    '/validateUserDeletion/:app/:userId',
    '/userDeletion/:app/:userId'
], async (req, res, next) => {
    if (!req.user.permissions.some(e => e.startsWith('PMU') || e.startsWith('PVU') || e.startsWith('PMB') || e.startsWith('PVB'))) {
        return res.status(403).json({ message: 'You don\'t have access for this API' });
    }
    next();
});

router.use(['/sm/:app/service/.*'], async (req, res, next) => {
    //Check is User is App Admin
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

function md5(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}

function conpareURL(tempUrl, url) {
    let tempUrlSegment = tempUrl.split("/").filter(_d => _d != "");
    let urlSegment = url.split("/").filter(_d => _d != "");
    if (tempUrlSegment.length != urlSegment.length) return false;

    tempUrlSegment.shift();
    urlSegment.shift();

    let flag = tempUrlSegment.every((_k, i) => {
        if (_k.startsWith("{") && _k.endsWith("}") && urlSegment[i] != "") return true;
        return _k === urlSegment[i];
    });
    logger.trace(`Compare URL :: ${tempUrl}, ${url} :: ${flag}`);
    return flag;
}

module.exports = router;