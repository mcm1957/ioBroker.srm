module.exports = {
	router: [
		{
			_id: 'IPV4_status',
			type: 'state',
			common: {
				name: 'WAN status of IPV4',
				type: 'string',
				role: 'text',
				def: '',
				read: true,
				write: false
			},
			native: {},
		},
		{
			_id: 'IPV4_IP',
			type: 'state',
			common: {
				name: 'WAN IP of IPV4',
				type: 'string',
				role: 'text',
				def: '',
				read: true,
				write: false
			},
			native: {},
		},
		{
			_id: 'IPV6_status',
			type: 'state',
			common: {
				name: 'WAN status of IPV6',
				type: 'string',
				role: 'text',
				def: '',
				read: true,
				write: false
			},
			native: {},
		},
		{
			_id: 'IPV6_IP',
			type: 'state',
			common: {
				name: 'WAN IP of IPV6',
				type: 'string',
				role: 'text',
				def: '',
				read: true,
				write: false
			},
			native: {},
		}
	],
	devices: [
		{
			_id: 'all',
			type: 'state',
			common: {
				name: 'All known devices',
				type: 'string',
				role: 'json',
				def: '',
				read: true,
				write: false
			},
			native: {},
		},
		{
			_id: 'online',
			type: 'state',
			common: {
				name: 'All online devices',
				type: 'string',
				role: 'json',
				def: '',
				read: true,
				write: false
			},
			native: {},
		},
		{
			_id: 'online_wifi',
			type: 'state',
			common: {
				name: 'All online WIFI devices',
				type: 'string',
				role: 'json',
				def: '',
				read: true,
				write: false
			},
			native: {},
		},
		{
			_id: 'online_ethernet',
			type: 'state',
			common: {
				name: 'All online ethernet devices',
				type: 'string',
				role: 'json',
				def: '',
				read: true,
				write: false
			},
			native: {},
		},
		{
			_id: 'mesh',
			type: 'state',
			common: {
				name: 'Mesh nodes',
				type: 'string',
				role: 'json',
				def: '',
				read: true,
				write: false
			},
			native: {},
		}
	],
	traffic: [
		{
			_id: 'live',
			type: 'state',
			common: {
				name: 'Live traffic',
				type: 'string',
				role: 'json',
				def: '',
				read: true,
				write: false
			},
			native: {},
		},
		// {
		// 	_id: "daily",
		// 	type: "state",
		// 	common: {
		// 		name: "Daily traffic",
		// 		type: "string",
		// 		role: "text",
		// 		def: "",
		// 		read: true,
		// 		write: false
		// 	},
		// 	native: {},
		// },
		// {
		// 	_id: "weekly",
		// 	type: "state",
		// 	common: {
		// 		name: "Weekly traffic",
		// 		type: "string",
		// 		role: "text",
		// 		def: "",
		// 		read: true,
		// 		write: false
		// 	},
		// 	native: {},
		// },
		// {
		// 	_id: "monthly",
		// 	type: "state",
		// 	common: {
		// 		name: "Monthly traffic",
		// 		type: "string",
		// 		role: "text",
		// 		def: "",
		// 		read: true,
		// 		write: false
		// 	},
		// 	native: {},
		// }
	],
	mesh: [
		{
			_id: 'band',
			type: 'state',
			common: {
				name: 'Uplink band',
				type: 'string',
				role: 'text',
				def: '',
				read: true,
				write: false
			},
			native: {},
		},
		{
			_id: 'connected_devices',
			type: 'state',
			common: {
				name: 'Number connected devices',
				type: 'number',
				role: 'value',
				read: true,
				write: false,
				unit: 'devices'
			},
			native: {},
		},
		{
			_id: 'current_rate_rx',
			type: 'state',
			common: {
				name: 'Current receive rate',
				type: 'number',
				role: 'media.bitrate',
				read: true,
				write: false,
				unit: 'bytes/s',
			},
			native: {},
		},
		{
			_id: 'current_rate_tx',
			type: 'state',
			common: {
				name: 'Current transmit rate',
				type: 'number',
				role: 'media.bitrate',
				read: true,
				write: false,
				unit: 'bytes/s',
			},
			native: {},
		},
		{
			_id: 'name',
			type: 'state',
			common: {
				name: 'Node name',
				type: 'string',
				role: 'text',
				def: '',
				read: true,
				write: false
			},
			native: {},
		},
		{
			_id: 'network_status',
			type: 'state',
			common: {
				name: 'Network status',
				type: 'string',
				role: 'text',
				def: '',
				read: true,
				write: false
			},
			native: {},
		},
		{
			_id: 'node_id',
			type: 'state',
			common: {
				name: 'Node ID',
				type: 'number',
				role: 'value',
				read: true,
				write: false,
				unit: '',
			},
			native: {},
		},
		{
			_id: 'node_status',
			type: 'state',
			common: {
				name: 'Node status',
				type: 'string',
				role: 'text',
				def: '',
				read: true,
				write: false
			},
			native: {},
		},
		{
			_id: 'parent_node_id',
			type: 'state',
			common: {
				name: 'Parent node ID',
				type: 'number',
				role: 'value',
				read: true,
				write: false,
				unit: '',
			},
			native: {},
		},
		{
			_id: 'signal_strength',
			type: 'state',
			common: {
				name: 'Signal strength',
				type: 'number',
				role: 'value',
				read: true,
				write: false,
				unit: '',
			},
			native: {},
		},
	],
};