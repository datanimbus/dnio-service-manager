
let logger = global.logger;
const request = require(`request`);
const envConfig = require(`../../../config/config`);
let e = {};

function informDSHrefChange(srvcObj, body, _req) {
	let path = srvcObj.uri.split(`?`)[0];
	let pathSplit = path.split(`/`);
	let app = pathSplit[1], api = pathSplit[2];
	let baseurl = `http://`;
	if(envConfig.isK8sEnv()){
		baseurl += `${api.toLowerCase()}.${envConfig.odpNS}-${app.toLowerCase()}`;
	}else{
		baseurl += `localhost:${srvcObj.port}`;
	}
	let url = `${baseurl}/${app}/${api}/utils/hrefUpdate`;
	var options = {
		url: url,
		method: `PUT`,
		headers: {
			'Content-Type': `application/json`,
			'TxnId': _req.get(`txnId`),
			'Authorization': _req.get(`Authorization`),
			'User': _req.get(`user`)
		},
		body: body,
		json: true
	};
	return new Promise((resolve) => {
		request(options, function (err) {
			if (err) {
				logger.error(err.message);
			}
			resolve();
		});
	});
}

e.updateHrefInDS = (id, app, api, relations, req) => {
	let body = {
		id: id,
		url: `/api/c/${app}${api}`
	};
	let promises = relations.map(_d => {
		return informDSHrefChange(_d, body, req);
	});
	return Promise.all(promises);
};

module.exports = e;
