let config = require(`../config/config`);
var clients = require(`@appveen/odp-utils`).natsStreaming;
var clientId = isK8sEnv() ? `${process.env.HOSTNAME}` : `SM`;
var client = clients.init(`odp-cluster`,clientId,config.NATSConfig);

function isK8sEnv() {
	return process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT && process.env.ODPENV == `K8s`;
}
module.exports = {
	client: client
};