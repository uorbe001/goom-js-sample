#!/usr/bin/env node

if (process.argv.length !== 3) {
	console.log("Expected ussage: socket_io_serv.js <port>");
	process.exit(1);
}

var sio = require('socket.io'), io = sio.listen(43000), parseCookie = require('connect').utils.parseCookie;
var GoomServer = require("goom-server-js"), gameServer, Responses = require("goom-ai-js").Responses;


var a1 = function() { return Responses.SUCCESS; };
var config = {
	"render_models": {
		"box": "/assets/box.wglmodel",
		"robot_arm": "/assets/robot_arm.wglmodel",
		"soldier": "/assets/soldier.skinned.wglmodel"
	},

	"agent_models": [
		{
			"name": "box_agent",
			"behaviour": { "type": "action", "execute": a1 },
			"movement": {
				"type": "walk",
				"velocity": 12,
				"angular_velocity": 10
			},
			"body": {
				"max_health": 100,
				"max_energy": 100,
				"weight": 1,
				"inertial_tensor": [1/12, 1/12, 1/12],
				"primitives": [
					{
						"type": "box",
						"halfSize": {"x": 1, "y": 1, "z": 1},
						"offset":  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
					}
				]
			},
			"appearance": {
				"model": "box"
			}
		}
	],

	"object_models": [
		{
			"name": "box_obj",
			"body": {
				"weight": 100,
				"inertial_tensor": [1/12, 1/12, 1/12],
				"primitives": [
					{
						"type": "box",
						"halfSize": {"x": 1, "y": 1, "z": 1},
						"offset":  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
					}
				]
			},
			"appearance": {
				"model": "box"
			}
		}
	],

	"level": {
		"cameras": [
			{
				"id": "camera0",
				"position": {"x": 0, "y": -1, "z": -4},
				"target": {"x": 0, "y": 0, "z": 0},
				"view_angle": 45,
				"active": true
			}
		],

		"force_generators": {
			"gravity": {
				"force": {"x": 0, "y": -10, "z": 0},
				"affected_bodies": ["0", "1"]
			}
		},

		"navigation_mesh": {
			"triangles": [
				{ "vertices": [0,0,0, 0,0,1, 1,0,1] },
				{ "vertices": [0,0,0, 1,0,1, 2,0,0] },
				{ "vertices": [2,0,0, 1,0,1, 2,0,2] },
				{ "vertices": [2,0,0, 2,0,2, 3,0,1] },
				{ "vertices": [2,0,0, 3,0,1, 4,0,0] },
				{ "vertices": [3,0,1, 4,0,2, 4,0,0] },
				{ "vertices": [2,0,0, 4,0,0, 3,0,-1] },
				{ "vertices": [2,0,0, 3,0,-1, 2,0,-2] },
				{ "vertices": [2,0,-2, 3,0,-1, 4,0,-2] }
			]
		},

		"agents": [
			/*{
				"id": "0",
				"model": "box_agent",
				"static": false,
				"position": {"x": 3, "y": 0, "z": 0},
				"orientation": {"r": 1, "i": 0, "j": 0, "k": 0},
				"health": 100,
				"energy": 80
			}*/
		],

		"objects": [
			/*{
				"id": "1",
				"model": "box_obj",
				"static": true,
				"position": {"x": 0, "y": -3, "z": 0},
				"orientation": {"r": 1, "i": 0, "j": 0, "k": 0}
			}*/
		],

		"planes": [
			{
				"id": "plane0",
				"normal": { "x": 0,	"y": 1, "z": 0},
				"offset": -3,
				"visible": true
			}
		]
	}
};

io.set('authorization', function (handshake, accept) {
	if (handshake.headers.cookie) {
		handshake.cookie = parseCookie(handshake.headers.cookie);
		handshake.sessionID = handshake.cookie["connect.sid"];
		return accept(null, true);
	}

	return accept('No cookie sent.', false);
});


//Annoying log...
io.set('log level', 0);

//Game socket.io
io.sockets.on('connection', function (socket) {
	gameServer.receiveEvent({"type": "connection", "from": socket.id});

	setInterval(function() {
		gameServer.update();
	}, 1000/10);

	socket.on('event', function (event) {
		event.from = socket.id;
		gameServer.receiveEvent(event);
	});
});

//Create the game server
var broadcast = function(event) { io.sockets.emit("event", event); };
var sendTo = function(event, id) { io.sockets.socket(id).emit("event", event); };

gameServer = new GoomServer(config, broadcast, sendTo);

gameServer.on("left", function(player) {
	player.velocity.x = -player.model.movement.velocity;
	player.body.isAwake = true;
});

gameServer.on("right", function(player) {
	player.velocity.x = player.model.movement.velocity;
	player.body.isAwake = true;
});

gameServer.on("up", function(player) {
	player.velocity.z = player.model.movement.velocity;
	player.body.isAwake = true;
	player.playAnimation("/assets/run");
});

gameServer.on("down", function(player) {
	player.velocity.z = -player.model.movement.velocity;
	player.body.isAwake = true;
});

gameServer.on("left_up", function(player) {
	player.velocity.x = 0;
	player.body.isAwake = true;
});

gameServer.on("right_up", function(player) {
	player.velocity.x = 0;
	player.body.isAwake = true;
});

gameServer.on("up_up", function(player) {
	player.velocity.z = 0;
	player.body.isAwake = true;
});

gameServer.on("down_up", function(player) {
	player.velocity.z = 0;
	player.body.isAwake = true;
});