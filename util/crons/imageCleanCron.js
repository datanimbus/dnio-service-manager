let exec = require('child_process').exec;
let command = 'docker images srvc* --format \'{{.Repository}}:{{.Tag}}\'';
let mongoose = require('mongoose');
let _ = require('lodash');
let logger = global.logger;
let cron = require('node-cron');

let dockerReg = process.env.DOCKER_REGISTRY_SERVER ? process.env.DOCKER_REGISTRY_SERVER : '';
if (dockerReg.length > 0 && !dockerReg.endsWith('/')) dockerReg += '/';
function init() {
	cron.schedule('18 3 * * *', function () {
		logger.info('Cron triggered to clean images');
		exec(command, (_err, _stdout, _stderr) => {
			logger.debug('Executing:: ' + command);
			if (_err) {
				logger.warn(`ERROR executing :: ${command}`);
				logger.warn(_stderr);
				return;
			}
			let runningImages = [];
			_stdout.split('\n').forEach(_s => {
				if (_s.length > 0) {
					let ob = {};
					let split = _s.split(':');
					ob['_id'] = split[0].toUpperCase();
					ob['version'] = isNaN(split[1]) ? split[1] : parseInt(split[1]);
					runningImages.push(ob);
				}
			});
			mongoose.model('services').find({}, '_id version').lean()
				.then(docs => {
					let newDocs = docs;
					newDocs.forEach(_d => {
						if (_d.version > 1)
							docs.push({ _id: _d._id, version: _d.version - 1 });
					});
					let difference = _.differenceWith(runningImages, docs, _.isEqual);
					let grepCmd = '';
					let grepCmd2 = '';
					if (difference.length == 0) return;
					difference.forEach((obj, i) => {
						if (i != 0) {
							grepCmd += '\\|';
							if (process.env.SM_ENV == 'K8s') grepCmd2 += '\\|';
						}
						grepCmd += `${obj._id.toLowerCase()}:${obj.version}`;
						if (process.env.SM_ENV == 'K8s') grepCmd2 += `${dockerReg}${obj._id.toLowerCase()}:${obj.version}`;
					});
					let filterCmd = `docker images --format '{{.Repository}}:{{.Tag}}' | grep '${grepCmd}'`;
					let filterCmd2 = '';
					if (process.env.SM_ENV == 'K8s') filterCmd2 = `docker images --format '{{.Repository}}:{{.Tag}}' | grep '${grepCmd2}'`;
					let removeCmd = `docker rmi $(${filterCmd})`;
					let removeCmd2 = '';
					if (process.env.SM_ENV == 'K8s') removeCmd2 = `docker rmi $(${filterCmd2})`;
					logger.info('Executing:: ' + removeCmd);
					exec(removeCmd, (_err, stdout, _stderr) => {
						if (_err) {
							logger.warn(`ERROR executing :: ${removeCmd}`);
							logger.warn(_stderr);
							return;
						}
						logger.info(`SUCCESS :: ${removeCmd}`);
						logger.info('Output:' + stdout);
						if (stdout.length > 0) {
							exec(removeCmd, (_err, stdout, _stderr) => {
								if (_err) {
									logger.warn(`ERROR executing :: ${removeCmd}`);
									logger.warn(_stderr);
									return;
								}
								logger.info(`SUCCESS :: ${removeCmd}`);
								logger.info('Output:' + stdout);

							});
						}
					});
					if (process.env.SM_ENV == 'K8s') {
						logger.info('Executing:: ' + removeCmd2);
						exec(removeCmd2, (_err, stdout, _stderr) => {
							if (_err) {
								logger.warn(`ERROR executing :: ${removeCmd2}`);
								logger.warn(_stderr);
								return;
							}
							logger.info(`SUCCESS :: ${removeCmd2}`);
							logger.info('Output:' + stdout);
						});
					}
				});
		});
	});
}

module.exports = init;