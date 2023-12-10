// ---------------------------------------------------------------------------------------------
// ioBroker Synology router SRM adapter
// ---------------------------------------------------------------------------------------------
'use strict';


// iobroker core
const utils = require('@iobroker/adapter-core');

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

        // SRM connection
        this.SrmClient = require(__dirname + '/lib/web_api.js').SrmClient;
        this.client = new this.SrmClient();
        // iobroker objects
        this.objects = require('./lib/objects');

        // Define variables
        this.stopTimer = null;
        this.isStopping = false;
        this.stopExecute = false;
        this.intervalId = null;
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
        await Promise.all(this.objects.router.map(async o => {
            // @ts-ignore
            await this.setObjectNotExistsAsync('router' + (o._id ? '.' + o._id : ''), o);
            this.log.debug('Create state for router.' + o._id);
        }));

        // Create traffic default states
        await Promise.all(this.objects.devices.map(async o => {
                // @ts-ignore
                await this.setObjectNotExistsAsync('devices' + (o._id ? '.' + o._id : ''), o);
                this.log.debug('Create state for devices.' + o._id);
            }));

        // Create traffic default states
        await Promise.all(this.objects.traffic.map(async o => {
            // @ts-ignore
            await this.setObjectNotExistsAsync('traffic' + (o._id ? '.' + o._id : ''), o);
            this.log.debug('Create state for traffic.' + o._id);
        }));

        // Validate IP address
        const checkRouterAddress = this.validateIPaddress(this.config.IP);
        if (!checkRouterAddress) {
            this.log.error('The server address ' + this.config.IP + ' is not a valid IP-Address');
            this.srmStop();
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
    async onUnload(callback) {
        try {
            if (this.intervalId) {
                this.clearInterval(this.intervalId);
                this.intervalId = null;
            }
            await this.client.logout();
            this.isStopping = true;

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
            const idSentry = 'system.adapter.${this.namespace}.plugins.sentry.enabled';
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
            await this.client.authenticate(baseUrl, null, { timeout: 5000 }, this.config.user, this.config.password);
            this.log.info('Connection to router is ready, starting device checking');
            this.stopExecute = false;

            // Set connection indicator
            this.setState('info.connection', true, true);

            this.srmCyclicCall();

        } catch (error) {
            this.log.error(error.message + ' for ' + this.config.IP);
            if (error.message === 'Request timeout') {
                this.srmReconnect();
            } else {
                this.srmStop();
            }
            return;
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Reconnect to Synology router
    async srmReconnect() {
        this.client = null;
        this.client = new this.SrmClient();
        this.log.info('Try to reconnect in 60s ...');
        this.setTimeout(async () => {
            this.srmConnect();
        }, 60000);
    }

    // ---------------------------------------------------------------------------------------------
    // Stop communication with Synology router
    async srmStop() {
        if (this.stopTimer) this.clearTimeout(this.stopTimer);
    }

    // ---------------------------------------------------------------------------------------------
    // Run in circles until stopped
    srmCyclicCall() {
        if (this.stopTimer) this.clearTimeout(this.stopTimer);
        if (!this.isStopping) {
            if (this.stopExecute === false) {
                this.srmUpdateData();
                this.intervalId = this.setInterval(() => {
                    this.srmUpdateData();
                }, this.config.interval*1000);
            }
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Get data from Synology router
    async srmUpdateData() {
        this.log.info('Polling data from router ${this.config.IP}');

        try {
            // Get connection status
            const conStatus = await this.client.getConnectionStatus();
            this.log.debug('Connection status: ${JSON.stringify(conStatus)}');
            await this.setStateAsync('router.IPV4_status', { val: conStatus.ipv4.conn_status, ack: true });
            await this.setStateAsync('router.IPV4_IP', { val: conStatus.ipv4.ip, ack: true });
            await this.setStateAsync('router.IPV6_status', { val: conStatus.ipv6.conn_status, ack: true });
            await this.setStateAsync('router.IPV6_IP', { val: conStatus.ipv6.ip, ack: true });

            // Get complete device list
            const deviceAll = await this.client.getAllDevices();
            this.log.debug('Device list all: ${JSON.stringify(deviceAll)}');
            await this.setStateAsync('devices.all', { val: JSON.stringify(deviceAll), ack: true });

            // Get active device list
            const deviceOnline = deviceAll.filter(item => item.is_online === true);
            this.log.debug('Device list online: ${JSON.stringify(deviceOnline)}');
            await this.setStateAsync('devices.online', { val: JSON.stringify(deviceOnline), ack: true });

            // Get active WIFI device list
            const deviceOnlineWifi = deviceAll.filter(item =>  item.is_online === true && item.is_wireless === true);
            this.log.debug('Device list WIFI online: ${JSON.stringify(deviceOnlineWifi)}');
            await this.setStateAsync('devices.online_wifi', { val: JSON.stringify(deviceOnlineWifi), ack: true });

            // Get active Ethernet device list
            const deviceOnlineEthernet = deviceAll.filter(item =>  item.is_online === true && item.is_wireless === false);
            this.log.debug('Device list Ethernet online: ${JSON.stringify(deviceOnlineEthernet)}');
            await this.setStateAsync('devices.online_ethernet', { val: JSON.stringify(deviceOnlineEthernet), ack: true });

            // Get mesh node data
            const meshNodes = await this.client.getMeshNodes();
            this.log.debug('Mesh nodes: ${JSON.stringify(meshNodes)}');
            await this.setStateAsync('devices.mesh', { val: JSON.stringify(meshNodes), ack: true });
            for (const node of meshNodes) {
                const node_name = node.name.replace(this.FORBIDDEN_CHARS, '_');
                // Create mesh node default states
                await Promise.all(this.objects.mesh.map(async o => {
                    // @ts-ignore
                    await this.setObjectNotExistsAsync('mesh.' + node_name + (o._id ? '.' + o._id : ''), o);
                    this.log.debug('Create state for mesh' + node_name.replace(this.FORBIDDEN_CHARS, '_') + '.' + o._id);
                }));

                await this.setStateAsync('mesh.' + node_name + '.band', { val: node.band, ack: true });
                await this.setStateAsync('mesh.' + node_name + '.connected_devices', { val: node.connected_devices, ack: true });
                await this.setStateAsync('mesh.' + node_name + '.current_rate_rx', { val: node.current_rate_rx/1000, ack: true });
                await this.setStateAsync('mesh.' + node_name + '.current_rate_tx', { val: node.current_rate_tx/1000, ack: true });
                await this.setStateAsync('mesh.' + node_name + '.network_status', { val: node.network_status, ack: true });
                await this.setStateAsync('mesh.' + node_name + '.node_id', { val: node.node_id, ack: true });
                await this.setStateAsync('mesh.' + node_name + '.node_status', { val: node.node_status, ack: true });
                await this.setStateAsync('mesh.' + node_name + '.parent_node_id', { val: node.parent_node_id, ack: true });
                await this.setStateAsync('mesh.' + node_name + '.signal_strength', { val: node.signalstrength, ack: true });
            }
            // await this.setStateAsync('traffic.live', { val: JSON.stringify(trafficLive), ack: true });

            // Get live traffic
            const trafficLive = await this.client.getTraffic('live');
            this.log.debug('Live traffic: ${JSON.stringify(trafficLive)}');
            await this.setStateAsync('traffic.live', { val: JSON.stringify(trafficLive), ack: true });

            // Get daily traffic
            // const trafficDaily = await client.getTraffic('day');
            // this.log.debug('Daily traffic: ${JSON.stringify(trafficDaily)}');
            // await this.setStateAsync('traffic.daily', { val: JSON.stringify(trafficDaily), ack: true });

        } catch (error) {
            if (String(error) === 'Error: Not connected') {
                this.log.error('Router is not connected, try new reconnect in 90s');
                this.stopExecute = true;
                this.srmReconnect();
            } else {
                this.log.error(error);
                this.stopExecute = true;
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