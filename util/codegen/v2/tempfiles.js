const logger = global.logger;

let dockerRegistryType = process.env.DOCKER_REGISTRY_TYPE ? process.env.DOCKER_REGISTRY_TYPE : '';
if (dockerRegistryType.length > 0) dockerRegistryType = dockerRegistryType.toUpperCase();

let dockerReg = process.env.DOCKER_REGISTRY_SERVER ? process.env.DOCKER_REGISTRY_SERVER : '';
if (dockerReg.length > 0 && !dockerReg.endsWith('/') && dockerRegistryType != 'ECR') dockerReg += '/';

function dockerFile(config) {
	if (!process.env.IMAGE_TAG) {
		process.env.IMAGE_TAG = 'dev';
	}
	let base = `${dockerReg}data.stack:base.${process.env.IMAGE_TAG}`;
	if (dockerRegistryType == 'ECR') base = `${dockerReg}:data.stack.base.${process.env.IMAGE_TAG}`;
	logger.debug(`Base image :: ${base}`);
	return `FROM ${base}
WORKDIR /app
COPY . .
ENV NODE_ENV production
ENV DATA_STACK_APP ${config.app}
ENV SERVICE_ID ${config._id}
ENV SERVICE_NAME ${config.name}
ENV SERVICE_VERSION ${config.version}
ENV SERVICE_PORT ${config.port}
ENV SERVICE_ENDPOINT ${config.api}
ENV SERVICE_COLLECTION ${config.collectionName}
ENV ID_PADDING ${config.idDetails.padding || '""'}
ENV ID_PREFIX ${config.idDetails.prefix || '""'}
ENV ID_SUFFIX ${config.idDetails.suffix || '""'}
ENV ID_COUNTER ${config.idDetails.counter}
ENV PERMANENT_DELETE ${config.permanentDeleteData}
EXPOSE ${config.port}
CMD [ "node", "app.js" ]
`;
}

function dotEnvFile(config) {
	return `
NODE_ENV="development"
MONGO_APPCENTER_URL="${process.env.MONGO_APPCENTER_URL}"
MONGO_AUTHOR_URL="${process.env.MONGO_AUTHOR_URL}"
MONGO_LOGS_URL="${process.env.MONGO_LOGS_URL}"
ODP_APP="${config.app}"
SERVICE_ID="${config._id}"
SERVICE_NAME="${config.name}"
SERVICE_VERSION="${config.version}"
SERVICE_PORT="${config.port}"
SERVICE_ENDPOINT="${config.api}"
SERVICE_COLLECTION="${config.collectionName}"
ID_PADDING="${config.idDetails.padding || ''}"
ID_PREFIX="${config.idDetails.prefix || ''}"
ID_SUFFIX="${config.idDetails.suffix || ''}"
ID_COUNTER="${config.idDetails.counter}"
PERMANENT_DELETE=${config.permanentDeleteData}
`;
}

module.exports = {
	dockerFile,
	dotEnvFile
};
