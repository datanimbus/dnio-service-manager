const router = require('express').Router();
const { AuthCacheMW } = require('@appveen/ds-auth-cache');
const _ = require('lodash');
const config = require('../config/config');
const trimUtils = require('./auth.trim');

const logger = global.logger;

const permittedUrls = [
	'/sm/internal/health/live',
	'/sm/internal/health/ready'
];

const onlyAuthUrls = [
	'/sm/{app}/service/verifyHook',
	'/sm/{app}/service/utils/{id}/lockDocument/count',
	'/sm/{app}/service/utils/{id}/swagger',
	'/sm/{app}/service/utils/{id}/checkUnique',
	'/sm/{app}/service/utils/verifyHook',
	'/sm/{app}/service/utils/{id}/yamls'
];

const internalUrls = [
	'/sm/{app}/internal/app',
	'/sm/{app}/internal/filequeue',
	'/sm/{app}/internal/validateUserDeletion/{userId}',
	'/sm/{app}/internal/userDeletion/{userId}',
	'/sm/{app}/service/utils/{id}/statusChange',
	'/sm/{app}/service/utils/{id}/statusChangeFromMaintenance',
	'/sm/internal/ds/env'
];

const adminOnlyUrls = [
	'/sm/service/fetchAll'
];

const commonUrls = [
	'/sm/{app}/calendar/enable',
	'/sm/{app}/calendar/disable',
	'/sm/{app}/service',
	'/sm/{app}/service/{id}',
	'/sm/{app}/service/utils/{name}',
	'/sm/{app}/service/utils/import/upload',
	'/sm/{app}/service/utils/import/list',
	'/sm/{app}/service/utils/import/{id}/show',
	'/sm/{app}/service/utils/import/{id}/start',
	'/sm/{app}/service/utils/import/{id}/clean',
	'/sm/{app}/service/utils/count',
	'/sm/{app}/service/utils/audit',
	'/sm/{app}/service/utils/audit/count',
	'/sm/{app}/service/utils/stopAll ',
	'/sm/{app}/service/utils/startAll ',
	'/sm/{app}/service/utils/repairAll',
	'/sm/{app}/service/utils/status/count',
	'/sm/{app}/service/utils/{id}/draftDelete',
	'/sm/{app}/service/utils/{id}/purge/all',
	'/sm/{app}/service/utils/{id}/purge/{type}',
	'/sm/{app}/service/utils/{id}/checkUnique',
	'/sm/{app}/service/utils/{id}/start',
	'/sm/{app}/service/utils/{id}/stop',
	'/sm/{app}/service/utils/{id}/deploy',
	'/sm/{app}/service/utils/{id}/repair',
	'/sm/{app}/service/utils/{id}/count',
	'/sm/{app}/service/utils/{id}/idCount',
	'/sm/{app}/globalSchema',
	'/sm/{app}/globalSchema/{id}',
	'/sm/{app}/globalSchema/utils/count',
	'/sm/{app}/globalSchema/utils/audit',
	'/sm/{app}/globalSchema/utils/audit/count',
];


router.use(AuthCacheMW({ permittedUrls: _.concat(permittedUrls, internalUrls), secret: config.RBAC_JWT_KEY, decodeOnly: true }));

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
	const matchingPath = commonUrls.find(e => compareURL(e, req.path));
	if (matchingPath) {
		const params = getUrlParams(matchingPath, req.path);
		
		if (params && params['{app}'] && !params['{app}'].match(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]+$/)) {
			return next(new Error('APP_NAME_ERROR :: App name must consist of alphanumeric characters or \'-\' , and must start and end with an alphanumeric character.'));
		}

		if (req.locals.app && params && req.locals.app !== params['{app}']) {
			return next(new Error("App in url does not match with one in either body or filter."));
		}
		
		if (!req.locals.app && params && params['{app}']) req.locals.app = params['{app}'];
	}

	if (!req.user) {
		req.user = {};
	}
	if (req.locals.app) {
		const temp = (req.user.allPermissions || []).find(e => e.app === req.locals.app);
		req.user.appPermissions = temp ? temp.permissions : [];
	} else {
		req.user.appPermissions = [];
	}
	if (req.user.isSuperAdmin || (req.user.apps && req.user.apps.indexOf(req.locals.app) > -1)) {
		req.locals.skipPermissionCheck = true;
	}
	next();
});

router.use((req, res, next) => {

	// Check if path required only authentication checks.
	if (_.concat(onlyAuthUrls, permittedUrls).some(e => compareURL(e, req.path))) {
		return next();
	}

	// Check if path is for internal Use.
	if (internalUrls.some(e => compareURL(e, req.path))) {
		// Some Auth check for internal URLs required.
		req.locals.skipPermissionCheck = true;
		return next();
	}

	// Check if path is allowed only to admins and super admins.
	if (adminOnlyUrls.some(e => compareURL(e, req.path)) && req.locals.skipPermissionCheck) {
		return next();
	}

	if (req.locals.app && !req.locals.app.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]+$/)) {
		return next(new Error('APP_NAME_ERROR :: App name must consist of alphanumeric characters or \'-\' , and must start and end with an alphanumeric character.'));
	}

	// All these paths required permissions check.
	if (commonUrls.some(e => compareURL(e, req.path))) {
		// Pass if user is admin or super admin.
		if (req.locals.skipPermissionCheck) {
			return next();
		}

		if (!req.locals.app) {
			res.status(400).json({ message: 'App value needed for this API' });
			return next(new Error('App value needed for this API'));
		}

		// Check if user has permission for the path.
		if (canAccessPath(req)) {
			return next();
		}

		if (!req.user.isSuperAdmin && !req.user.allPermissions.find(e => e.app === req.locals.app) && !req.user.apps.includes(req.locals.app)) {
			res.status(403).json({ "message": "You don't have permissions for this app." });
			return next(new Error("You don't have permissions for this app."));
		}
	}

	res.status(403).json({ message: 'You don\'t have access for this API' });
	return next(new Error("You don't have permissions for this app."));
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

	if (compareURL('/sm/{app}/service', req.path) && req.method === 'GET') {
		return true;
	}
	if (compareURL('/sm/{app}/service/{id}', req.path) && req.method === 'GET') {
		return true;
	}

	if (compareURL('/sm/{app}/service', req.path) && _.intersectionWith(req.user.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
		if ((req.method == 'POST')) {
			if (_.intersectionWith(req.user.appPermissions, ['PMDS'], comparator).length > 0) {
				return true;
			} else {
				return false;
			}
		}
		return true;
	}
	if (compareURL('/sm/{app}/service/{id}', req.path) && _.intersectionWith(req.user.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
		if ((req.method == 'PUT' || req.method == 'DELETE')) {
			if (_.intersectionWith(req.user.appPermissions, ['PMDS'], comparator).length > 0) {
				return true;
			} else {
				return false;
			}
		}
		return true;
	}

	if (compareURL('/sm/{app}/service/utils/import/upload', req.path) && _.intersectionWith(req.user.appPermissions, ['PMDS'], comparator).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/import/list', req.path) && _.intersectionWith(req.user.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/import/{id}/show', req.path) && _.intersectionWith(req.user.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/import/{id}/start', req.path) && _.intersectionWith(req.user.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/import/{id}/clean', req.path) && _.intersectionWith(req.user.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/{app}/{name}', req.path) && _.intersectionWith(req.user.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/count', req.path) && _.intersectionWith(req.user.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/audit', req.path) && _.intersectionWith(req.user.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/audit/count', req.path) && _.intersectionWith(req.user.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/{id}/draftDelete', req.path) && _.intersectionWith(req.user.appPermissions, ['PMDS'], comparator).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/{id}/purge/all', req.path) && _.intersection(req.user.appPermissions, ['PMDSS']).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/{id}/purge/{type}', req.path) && _.intersection(req.user.appPermissions, ['PMDSS']).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/{id}/swagger', req.path) && _.intersectionWith(req.user.appPermissions, ['PVDS', 'PMDS'], comparator).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/{id}/checkUnique', req.path) && _.intersection(req.user.appPermissions, ['PMDSD', 'PVDSD']).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/globalSchema', req.path) && _.intersection(req.user.appPermissions, ['PVL', 'PML']).length > 0) {
		if ((req.method == 'POST')) {
			if (_.intersection(req.user.appPermissions, ['PML']).length > 0) {
				return true;
			} else {
				return false;
			}
		}
		return true;
	}
	if (compareURL('/sm/{app}/globalSchema/{id}', req.path) && _.intersection(req.user.appPermissions, ['PVL', 'PML']).length > 0) {
		if ((req.method == 'PUT' || req.method == 'DELETE')) {
			if (_.intersection(req.user.appPermissions, ['PML']).length > 0) {
				return true;
			} else {
				return false;
			}
		}
		return true;
	}
	if (compareURL('/sm/{app}/globalSchema/utils/count', req.path) && _.intersection(req.user.appPermissions, ['PVL', 'PML']).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/globalSchema/utils/audit', req.path) && _.intersection(req.user.appPermissions, ['PVL', 'PML']).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/globalSchema/utils/audit/count', req.path) && _.intersection(req.user.appPermissions, ['PVL', 'PML']).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/{id}/start', req.path) && _.intersection(req.user.appPermissions, ['PMDSPS']).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/{id}/stop', req.path) && _.intersection(req.user.appPermissions, ['PMDSPS']).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/{id}/deploy', req.path) && _.intersection(req.user.appPermissions, ['PMDSPD']).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/{id}/repair', req.path) && _.intersection(req.user.appPermissions, ['PMDSPD']).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/{id}/count', req.path) && _.intersectionWith(req.user.appPermissions, ['PMDS', 'PVDS'], comparator).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/service/utils/{id}/idCount', req.path) && _.intersection(req.user.appPermissions, ['PMDSD', 'PVDSD']).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/logs', req.path) && _.intersection(req.user.appPermissions, ['PVDSA']).length > 0) {
		return true;
	}
	if (compareURL('/sm/{app}/tags', req.path) && _.intersection(req.user.appPermissions, ['PVDSS', 'PMDSS']).length > 0) {
		return true;
	}
	return false;
}


function comparator(main, pattern) {
	return main.startsWith(pattern);
}

function getUrlParams(tempUrl, url) {
	const values = {};
	let tempUrlSegment = tempUrl.split('/').filter(_d => _d != '');
	let urlSegment = url.split('/').filter(_d => _d != '');
	tempUrlSegment.shift();
	urlSegment.shift();
	tempUrlSegment.forEach((_k, i) => {
		if (_k.startsWith('{') && _k.endsWith('}') && urlSegment[i] != '') {
			values[_k] = urlSegment[i];
		}
	});
	logger.trace(`Params Map :: ${values}`);
	return values;
}

router.use(['/sm/{app}/service', '/sm/{app}/service/:id'], async (req, res, next) => {

	const original = res.json;
	function jsonHook(json) {
		if (json && !req.user.skipPermissionCheck) {
			if (Array.isArray(json)) {
				json.forEach(data => trimUtils.trimData(req, data));
			} else if (json && typeof json === 'object') {
				trimUtils.trimData(req, json);
			}
		}
		return original.call(this, json);
	}
	res.json = jsonHook;

	if (req.locals.skipPermissionCheck) {
		return next();
	}
	if ((req.method == 'POST' || req.method == 'PUT')) {
		if (_.intersection(req.user.appPermissions, ['PMDSD']).length == 0 && ['definition'].some(key => _.has(req.body, key))) {
			return res.status(403).json({ message: 'You don\'t have access for Design' });
		}

		if (_.intersection(req.user.appPermissions, ['PMDSI']).length == 0 && ['webHooks', 'preHooks', 'postHooks'].some(key => _.has(req.body, key))) {
			return res.status(403).json({ message: 'You don\'t have access for Integration' });
		}

		if (_.intersection(req.user.appPermissions, ['PMDSE']).length == 0 && ['wizard', 'stateModel'].some(key => _.has(req.body, key))) {
			return res.status(403).json({ message: 'You don\'t have access for Experience' });
		}

		if (_.intersection(req.user.appPermissions, ['PMDSR', 'PMDSD']).length == 0 && ['role'].some(key => _.has(req.body, key))) {
			return res.status(403).json({ message: 'You don\'t have access for Roles' });
		}

		if (_.intersection(req.user.appPermissions, ['PMDSS']).length == 0 && ['disableInsights', 'permanentDeleteData', 'api', 'versionValidity', 'headers', 'enableSearchIndex'].some(key => _.has(req.body, key))) {
			return res.status(403).json({ message: 'You don\'t have access for Settings' });
		}
	}
	next();
});

module.exports = router;