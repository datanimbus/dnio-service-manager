const logger = global.logger;

let dockerRegistryType = process.env.DOCKER_REGISTRY_TYPE ? process.env.DOCKER_REGISTRY_TYPE : '';
if (dockerRegistryType.length > 0) dockerRegistryType = dockerRegistryType.toUpperCase();

let dockerReg = process.env.DOCKER_REGISTRY_SERVER ? process.env.DOCKER_REGISTRY_SERVER : '';
if (dockerReg.length > 0 && !dockerReg.endsWith('/') && dockerRegistryType != 'ECR') dockerReg += '/';

function dockerFile(serviceDetails) {
	if (!process.env.IMAGE_TAG) {
		process.env.IMAGE_TAG = 'dev';
	}
	let base = `${dockerReg}data.stack.base:${process.env.IMAGE_TAG}`;
	if (dockerRegistryType == 'ECR') base = `${dockerReg}:data.stack.base.${process.env.IMAGE_TAG}`;
	logger.debug(`Base image :: ${base}`);
	return `FROM ${base}
WORKDIR /app
COPY . .
ENV NODE_ENV production
ENV DATA_STACK_APP ${serviceDetails.app}
ENV SERVICE_ID ${serviceDetails._id}
ENV SERVICE_NAME ${serviceDetails.name}
ENV SERVICE_VERSION ${serviceDetails.version}
ENV SERVICE_PORT ${serviceDetails.port}
ENV SERVICE_ENDPOINT ${serviceDetails.api}
ENV SERVICE_COLLECTION ${serviceDetails.collectionName}
ENV ID_PADDING ${serviceDetails.idDetails && serviceDetails.idDetails.padding ? serviceDetails.idDetails.padding : '""'}
ENV ID_PREFIX ${serviceDetails.idDetails && serviceDetails.idDetails.prefix ? serviceDetails.idDetails.prefix : '""'}
ENV ID_SUFFIX ${serviceDetails.idDetails && serviceDetails.idDetails.suffix ? serviceDetails.idDetails.suffix : '""'}
ENV ID_COUNTER ${serviceDetails.idDetails && serviceDetails.idDetails.counter ? serviceDetails.idDetails.counter : '""'}
ENV PERMANENT_DELETE ${serviceDetails.permanentDeleteData}
ENV DATA_STACK_ALLOWED_FILE_TYPE ${serviceDetails.allowedFileTypes}
ENV STORAGE_ENGINE ${process.env.STORAGE_ENGINE || 'GRIDFS'}
ENV STORAGE_AZURE_CONNECTION_STRING ${process.env.STORAGE_AZURE_CONNECTION_STRING}
ENV STORAGE_AZURE_CONTAINER ${process.env.STORAGE_AZURE_CONTAINER}
ENV STORAGE_AZURE_SHARED_KEY ${process.env.STORAGE_AZURE_SHARED_KEY}
ENV STORAGE_AZURE_TIMEOUT ${process.env.STORAGE_AZURE_TIMEOUT}
EXPOSE ${serviceDetails.port}
CMD [ "node", "app.js" ]
`;
}

function dotEnvFile(serviceDetails) {
	return `
NODE_ENV="development"
MONGO_APPCENTER_URL="${process.env.MONGO_APPCENTER_URL}"
MONGO_AUTHOR_URL="${process.env.MONGO_AUTHOR_URL}"
MONGO_LOGS_URL="${process.env.MONGO_LOGS_URL}"
ODP_APP="${serviceDetails.app}"
SERVICE_ID="${serviceDetails._id}"
SERVICE_NAME="${serviceDetails.name}"
SERVICE_VERSION="${serviceDetails.version}"
SERVICE_PORT="${serviceDetails.port}"
SERVICE_ENDPOINT="${serviceDetails.api}"
SERVICE_COLLECTION="${serviceDetails.collectionName}"
ID_PADDING="${serviceDetails.idDetails && serviceDetails.idDetails.padding ? serviceDetails.idDetails.padding : ''}"
ID_PREFIX="${serviceDetails.idDetails && serviceDetails.idDetails.prefix ? serviceDetails.idDetails.prefix : ''}"
ID_SUFFIX="${serviceDetails.idDetails && serviceDetails.idDetails.suffix ? serviceDetails.idDetails.suffix : ''}"
ID_COUNTER="${serviceDetails.idDetails && serviceDetails.idDetails.counter ? serviceDetails.idDetails.counter : ''}"
PERMANENT_DELETE=${serviceDetails.permanentDeleteData}
HOSTNAME="localhost"
DATA_STACK_APP_NS="appveen-${serviceDetails.app}"
DATA_STACK_NAMESPACE="appveen"
DATA_STACK_APP="${serviceDetails.app}"
DATA_STACK_ALLOWED_FILE_TYPE="${serviceDetails.allowedFileTypes}"
STORAGE_ENGINE="${process.env.STORAGE_ENGINE || 'GRIDFS'}"
STORAGE_AZURE_CONNECTION_STRING="${process.env.STORAGE_AZURE_CONNECTION_STRING}"
STORAGE_AZURE_CONTAINER="${process.env.STORAGE_AZURE_CONTAINER}"
STORAGE_AZURE_SHARED_KEY="${process.env.STORAGE_AZURE_SHARED_KEY}"
STORAGE_AZURE_TIMEOUT="${process.env.STORAGE_AZURE_TIMEOUT}"
`;
}

module.exports = {
	dockerFile,
	dotEnvFile
};
