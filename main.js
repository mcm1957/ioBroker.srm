// ---------------------------------------------------------------------------------------------
// ioBroker Synology router SRM adapter
// ---------------------------------------------------------------------------------------------
'use strict';

// ---------------------------------------------------------------------------------------------
// SRM connection
const SrmClient = require(__dirname + '/lib/web_api.js').SrmClient;
let client = new SrmClient();
const objects = require('./lib/objects');

// iobroker core
const utils = require('@iobroker/adapter-core');

// ---------------------------------------------------------------------------------------------
// Define variables
const intervalId = null;
let stopTimer = null;
let isStopping = false;
let stopExecute = false;

class Srm extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'srm',
		});
		this.on('ready', this.onReady.bind(this));
		// this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Reset the connection indicator during startup
		this.setState('info.connection', false, true);

		try {
			if (await this.setSentryLogging(this.config.sentry)) return;
		} catch (e) {
			this.log.error('Error in main(): ' + e);
		}

		// Create router default states
		await Promise.all(objects.router.map(async o => {
			// @ts-ignore
			await this.setObjectNotExistsAsync('router' + (o._id ? '.' + o._id : ''), o);
			this.log.debug('Create state for router.' + o._id);
		}));

		// Create traffic default states
		await Promise.all(objects.devices.map(async o => {
				// @ts-ignore
				await this.setObjectNotExistsAsync('devices' + (o._id ? '.' + o._id : ''), o);
				this.log.debug('Create state for devices.' + o._id);
			}));

		// Create traffic default states
		await Promise.all(objects.traffic.map(async o => {
			// @ts-ignore
			await this.setObjectNotExistsAsync('traffic' + (o._id ? '.' + o._id : ''), o);
			this.log.debug('Create state for traffic.' + o._id);
		}));

		// Validate IP address
		const checkRouterAddress = this.validateIPaddress(this.config.IP);
		if (!checkRouterAddress) {
			this.log.error('The server address ' + this.config.IP + ' is not a valid IP-Address');
			stop_polling(this);
			return;
		}

		// Force polling minimum to 60 seconds
		if (this.config.interval < 60) { this.config.interval = 60; }

		this.srmConnect();
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();
		} catch (e) {
			callback();
		}
	}

	// ---------------------------------------------------------------------------------------------
	// Change the external Sentry Logging. After changing the Logging
	// the adapter restarts once
	// @param {*} value : this.config.sentry_enable for example
	async setSentryLogging(value) {
		try {
			value = value === true;
			const idSentry = `system.this.${this.namespace}.plugins.sentry.enabled`;
			const stateSentry = await this.getForeignStateAsync(idSentry);
			if (stateSentry && stateSentry.val !== value) {
				await this.setForeignStateAsync(idSentry, value);
				this.log.info('Restarting adapter because of changed sentry settings');
				this.restart();
				return true;
			}
		} catch (error) {
			return false;
		}
		return false;
	}

	// ---------------------------------------------------------------------------------------------
	// Connect to Synology router
	async srmConnect() {
		try {
			// Create base URL
			const baseUrl = 'https://' + this.config.IP + ':' + this.config.port;
			this.log.debug('Connecting to router ' + baseUrl);

			// Login to router
			const sid = await client.authenticate(baseUrl, null, { timeout: 5000 }, this.config.user, this.decrypt(this.config.password));
			this.log.info('Connection to router is ready, starting device checking');
			stopExecute = false;
			this.srmCyclicCall();

		} catch (error) {
			this.log.error(error);
			stop_polling(this);
			return;
		}
	}

	// ---------------------------------------------------------------------------------------------
	// Run in circles until stopped
	srmCyclicCall() {
		if (stopTimer) clearTimeout(stopTimer);
		if (!isStopping) {
			if (stopExecute === false) {
				const intervalId = setInterval(() => {
					this.srmUpdateData(this);
				}, this.config.interval*1000);
			}
		}
	}

	// ---------------------------------------------------------------------------------------------
	// Get data from Synology router
	async srmUpdateData(adapter) {
		try {
			// Get connection status
			const conStatus = await client.getConnectionStatus();
			this.log.debug(`Connection status: ${JSON.stringify(conStatus)}`);
			await this.setStateAsync('router.IPV4_status', { val: conStatus.ipv4.conn_status, ack: true });
			await this.setStateAsync('router.IPV4_IP', { val: conStatus.ipv4.ip, ack: true });
			await this.setStateAsync('router.IPV6_status', { val: conStatus.ipv6.conn_status, ack: true });
			await this.setStateAsync('router.IPV6_IP', { val: conStatus.ipv6.ip, ack: true });

			// Get complete device list
			const deviceAll = await client.getAllDevices();
			this.log.debug(`Device list all: ${JSON.stringify(deviceAll)}`);
			await this.setStateAsync('devices.all', { val: JSON.stringify(deviceAll), ack: true });

			// Get active device list
			const deviceOnline = deviceAll.filter(item => item.is_online === true);
			this.log.debug(`Device list online: ${JSON.stringify(deviceOnline)}`);
			await this.setStateAsync('devices.online', { val: JSON.stringify(deviceOnline), ack: true });

			// Get active WIFI device list
			const deviceOnlineWifi = deviceAll.filter(item =>  item.is_online === true && item.is_wireless === true);
			this.log.debug(`Device list WIFI online: ${JSON.stringify(deviceOnlineWifi)}`);
			await this.setStateAsync('devices.online_wifi', { val: JSON.stringify(deviceOnlineWifi), ack: true });

			// Get active ethernet device list
			const deviceOnlineEthernet = deviceAll.filter(item =>  item.is_online === true && item.is_wireless === false);
			this.log.debug(`Device list ethernet online: ${JSON.stringify(deviceOnlineEthernet)}`);
			await this.setStateAsync('devices.online_ethernet', { val: JSON.stringify(deviceOnlineEthernet), ack: true });

			// Get mesh node data
			const meshNodes = await client.getMeshNodes();
			this.log.debug(`Mesh nodes: ${JSON.stringify(meshNodes)}`);
			await this.setStateAsync('devices.mesh', { val: JSON.stringify(meshNodes), ack: true });
			for (const node of meshNodes) {
				// Create mesh node default states
				await Promise.all(objects.mesh.map(async o => {
					// @ts-ignore
					await this.setObjectNotExistsAsync('mesh.' + node.name + (o._id ? '.' + o._id : ''), o);
					this.log.debug('Create state for mesh' + node.name + '.' + o._id);
				}));

				await this.setStateAsync('mesh.' + node.name + '.band', { val: node.band, ack: true });
				await this.setStateAsync('mesh.' + node.name + '.connected_devices', { val: node.connected_devices, ack: true });
				await this.setStateAsync('mesh.' + node.name + '.current_rate_rx', { val: node.current_rate_rx, ack: true });
				await this.setStateAsync('mesh.' + node.name + '.current_rate_tx', { val: node.current_rate_tx, ack: true });
				await this.setStateAsync('mesh.' + node.name + '.network_status', { val: node.network_status, ack: true });
				await this.setStateAsync('mesh.' + node.name + '.node_id', { val: node.node_id, ack: true });
				await this.setStateAsync('mesh.' + node.name + '.node_status', { val: node.node_status, ack: true });
				await this.setStateAsync('mesh.' + node.name + '.parent_node_id', { val: node.parent_node_id, ack: true });
				await this.setStateAsync('mesh.' + node.name + '.signal_strength', { val: node.signalstrength, ack: true });
			}
			// await this.setStateAsync('traffic.live', { val: JSON.stringify(trafficLive), ack: true });

			// Get live traffic
			const trafficLive = await client.getTraffic('live');
			this.log.debug(`Live traffic: ${JSON.stringify(trafficLive)}`);
			await this.setStateAsync('traffic.live', { val: JSON.stringify(trafficLive), ack: true });

			// Get daily traffic
			// const trafficDaily = await client.getTraffic('day');
			// this.log.debug(`Daily traffic: ${JSON.stringify(trafficDaily)}`);
			// await this.setStateAsync('traffic.daily', { val: JSON.stringify(trafficDaily), ack: true });

		} catch (error) {
			if (String(error) === 'Error: Not connected') {
				this.log.error('Router is not connected, try new reconnect in 90s');
				stopExecute = true;
				setTimeout(function () {
					srmReconnect(adapter);
				}, 90000);
			} else {
				this.log.error(error);
				stopExecute = true;
			}
		}
	}

	// ---------------------------------------------------------------------------------------------
	// Validate IP address
	validateIPaddress(inputText) {
		const ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
		return !!inputText.match(ipformat);
	}

}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Srm(options);
} else {
	// otherwise start the instance directly
	new Srm();
}

// ---------------------------------------------------------------------------------------------
// Reconnect to Synology router
function srmReconnect(adapter) {
	client = null;
	client = new SrmClient();
	adapter.srmConnect();
}

// ---------------------------------------------------------------------------------------------
// Is called when adapter shuts down
function stop_polling(adapter) {
	if (stopTimer) clearTimeout(stopTimer);

	// Stop only if schedule mode
	if (adapter.common && adapter.common.mode == 'schedule') {
		stopTimer = setTimeout(function () {
			stopTimer = null;
			if (intervalId) clearInterval(intervalId);
			isStopping = true;
			stop_polling();
		}, 30000);
	}
}