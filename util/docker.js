let exec = require('child_process').exec;
const logger = global.logger;
var e = {};
var path = require('path');

var HOST = 'host.docker.internal';
if (process.env.PLATFORM == 'NIX') HOST = 'localhost';

let dockerReg = process.env.DOCKER_REGISTRY_SERVER ? process.env.DOCKER_REGISTRY_SERVER : '';
if (dockerReg.length > 0 && !dockerReg.endsWith('/')) dockerReg += '/';

function execCommand(command, errMsg) {
	return new Promise((resolve, reject) => {
		exec(command, (_err, _stdout) => {
			if (_err) {
				logger.error(`ERROR :: ${command}`);
				logger.error(_err);
				return reject(new Error(errMsg));
			}
			logger.info(`SUCCESS :: ${command}`);
			logger.debug(_stdout);
			return resolve(_stdout);
		});
	});
}

e.build = (_schema) => {
	logger.debug(JSON.stringify(_schema));
	logger.info(__dirname);
	let location = path.resolve(process.cwd(), _schema.path);
	logger.info('process.cwd() :: ' + process.cwd());
	logger.info('location :: ' + location);
	let startPromise = null;
	if (process.env.DOCKER_USER && process.env.DOCKER_PASSWORD && process.env.DOCKER_REGISTRY_SERVER) {
		let dockerLoginCmd = `docker login -u ${process.env.DOCKER_USER} -p ${process.env.DOCKER_PASSWORD} ${process.env.DOCKER_REGISTRY_SERVER}`;
		startPromise = execCommand(dockerLoginCmd, 'docker login failed');
	} else {
		startPromise = Promise.resolve();
	}
	return startPromise
		.then(() => {
			let command = 'cd ' + location + '; docker build -t ' + _schema._id.toLowerCase() + ':' + _schema.version + ' .';
			logger.debug(command);
			return execCommand(command, 'Error deploying service!');
		})
		.then((_r) => {
			if (process.env.SM_ENV == 'K8s' && dockerReg.length > 0) {
				let command = 'docker tag ' + _schema._id.toLowerCase() + ':' + _schema.version + ' ' + dockerReg + _schema._id.toLowerCase() + ':' + _schema.version + '; docker push ' + dockerReg + _schema._id.toLowerCase() + ':' + _schema.version;
				logger.debug(command);
				return execCommand(command, 'Error pushing image to service!');
			}
			return Promise.resolve(_r);
		});
};

e.removeImage = (_imageName, _version) => {
	logger.info('Removing image :: ' + _imageName.toLowerCase() + ':' + _version);
	return new Promise((_resolve, _reject) => {
		let command = 'docker image rm ' + _imageName.toLowerCase() + ':' + _version;
		if (process.env.SM_ENV == 'K8s')
			command += '; docker image rm ' + dockerReg + _imageName.toLowerCase() + ':' + _version;
		logger.debug(command);
		exec(command, (_err, _stdout, _stderr) => {
			if (_err) {
				logger.warn(`ERROR executing :: ${command}`);
				logger.warn(_stderr);
				if (_stderr.indexOf('No such image') == -1) {
					logger.error(_err);
					_reject('Error removing image!');
					return;
				}
			}
			logger.info(`SUCCESS :: ${command}`);
			logger.debug(_stdout);
			_resolve();
		});
	});
};

e.startService = (_schema) => {
	logger.debug(JSON.stringify(_schema));
	return new Promise((_resolve, _reject) => {
		let command = 'docker run -d --restart=always --name ' + _schema._id.toLowerCase() + ' -p ' + _schema.port + ':' + _schema.port + ' -e MONGO_AUTHOR_URL=mongodb://' + HOST + ':27017/odp -e MONGO_APPCENTER_URL=mongodb://' + HOST + ':27017/odpGen -e MONGO_APPCENTER_BASE_URL=mongodb://' + HOST + ':27017 -e MONGO_APPCENTER_DBNAME=odpGen -e AMQ_PORT=32002 -e AMQ_HOST=' + HOST + ' ';
		logger.debug(command);
		if (process.env.PLATFORM == 'NIX') command += '--net host -e PLATFORM=NIX ';
		command += _schema._id.toLowerCase() + ':' + _schema.version;
		exec(command, (_err, _stdout, _stderr) => {
			if (_err) {
				logger.error(`ERROR :: ${command}`);
				logger.error(_err);
				logger.warn(_stderr);
				_reject('Error deploying service!');
				return;
			}
			logger.info(`SUCCESS :: ${command}`);
			logger.debug(_stdout);
			_resolve(_stdout);
		});
	});
};

e.stopService = (_containerID) => {
	logger.info('Stopping container :: ' + _containerID.toLowerCase());
	return new Promise((_resolve, _reject) => {
		let command = 'docker container stop ' + _containerID.toLowerCase();
		logger.debug(command);
		exec(command, (_err, _stdout, _stderr) => {
			if (_err) {
				logger.warn(`ERROR executing :: ${command}`);
				logger.warn(_stderr);
				if (_stderr.indexOf('No such container') == -1) {
					logger.error(_err);
					_reject('Error stopping service!');
					return;
				}
			}
			logger.info(`SUCCESS :: ${command}`);
			logger.debug(_stdout);
			_resolve();
		});

	});
};

e.removeService = (_containerID) => {
	logger.info('Removing container :: ' + _containerID.toLowerCase());
	return new Promise((_resolve, _reject) => {
		let command = 'docker container rm ' + _containerID.toLowerCase();
		logger.debug(command);
		exec(command, (_err, _stdout, _stderr) => {
			if (_err) {
				logger.warn(`ERROR executing :: ${command}`);
				logger.warn(_stderr);
				if (_stderr.indexOf('No such container') == -1) {
					logger.error(_err);
					_reject('Error stopping service!');
					return;
				}
			}
			logger.info(`SUCCESS :: ${command}`);
			logger.debug(_stdout);
			_resolve();
		});

	});
};

e.getListOfRunningServices = (_containerID) => {
	logger.info('Getting list of running containers for service ' + _containerID);
	return new Promise((_resolve, _reject) => {
		let command = 'docker ps -a --format \'{{.Names}}\' -f name=' + _containerID.toLowerCase();
		logger.debug(command);
		exec(command, (_err, _stdout, _stderr) => {
			if (_err) {
				logger.warn(`ERROR executing :: ${command}`);
				logger.warn(_stderr);
				_reject('Error fetching running containers!');
				return;
			}
			logger.info(`SUCCESS :: ${command}`);
			logger.debug(_stdout);
			_resolve(_stdout);
		});

	});
};

module.exports = e;