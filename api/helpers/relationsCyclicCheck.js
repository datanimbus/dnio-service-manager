const mongoose = require(`mongoose`);
const logger = global.logger;
let e = {};
// const sampleServices = require('./sampleServices');

function getServices() {
	let services = [];
	// return Promise.resolve(sampleServices);
	return mongoose.model(`services`).find({}, `_id relatedSchemas`)
		.then(_docs => {
			_docs.forEach(doc => {
				services.push({
					_id: doc._id,
					relatedSchemas: doc.relatedSchemas,
					visited: false
				});
			});
			return services;
		})
		.catch(err => {
			logger.error(err);
		});
}

function markAndCheckVisited(serviceId, services) {
	let obj = services.find(obj => obj._id === serviceId);
	if (!obj) throw new Error(`Related service ` + serviceId + `not found`);
	if (obj.visited === true) {
		return true;
	}
	obj.visited = true;
}

function traversePath(direction, services, serviceId) {
	let isVisited = markAndCheckVisited(serviceId, services);
	if (isVisited) return true;
	let serviceDetail = services.find(obj => obj._id === serviceId);
	if (serviceDetail.relatedSchemas[direction] && serviceDetail.relatedSchemas[direction].length > 0) {
		let isCyclic = false;
		serviceDetail.relatedSchemas[direction].forEach(obj => {
			let duplicateObj = JSON.parse(JSON.stringify(services));
			isCyclic = isCyclic || traversePath(direction, duplicateObj, obj.service);
		});
		return isCyclic;
	} else {
		return false;
	}
}

e.checkCyclic = (serviceId, relatedSchemas) => {
	let services = [];
	return getServices()
		.then(_srvc => {
			services = JSON.parse(JSON.stringify(_srvc));
			let serviceObj = services.find(obj => obj._id === serviceId);
			if (serviceObj) {
				serviceObj.relatedSchemas = JSON.parse(JSON.stringify(relatedSchemas));
			} else {
				services.push({
					_id: serviceId,
					relatedSchemas,
					visited: false
				});
			}
			services = services.map(obj => {
				if (relatedSchemas.outgoing.find(inObj => inObj.service === obj._id)) {
					if (!obj.relatedSchemas.incoming) obj.relatedSchemas.incoming = [];
					let inObj = obj.relatedSchemas.incoming.find(obj => obj._id === serviceId);
					if (!inObj) {
						obj.relatedSchemas.incoming.push({
							service: serviceId
						});
					}
				}
				return obj;
			});
			let isCyclicIncoming = traversePath(`incoming`, JSON.parse(JSON.stringify(services)), serviceId);
			let isCyclicOutgoing = traversePath(`outgoing`, JSON.parse(JSON.stringify(services)), serviceId);
			return isCyclicIncoming || isCyclicOutgoing;
		})
		.catch(err => {
			logger.error(err.message);
		});
};

// e.checkCyclic("SRVC1006", {
//     "incoming": [{
//         "service": "SRVC1007",
//         "uri": "/abc",
//         "port": 20001
//     }],
//     "outgoing": [{
//         "service": "SRVC1003",
//         "path": "{}"
//     }, {
//         "service": "SRVC1005",
//         "path": "{}"
//     },{
//         "service": "SRVC1001",
//         "path": "{}"
//     }
// ]
module.exports = e;