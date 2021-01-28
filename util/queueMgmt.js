let config = require('../config/config');

var clientId = process.env.HOSTNAME || 'SM';

var client = require('@appveen/data.stack-utils').streaming.init(
	process.env.STREAMING_CHANNEL || 'datastack-cluster',
	clientId,
	config.NATSConfig
);

module.exports = {
	client: client
};