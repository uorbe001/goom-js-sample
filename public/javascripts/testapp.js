require(["/javascripts/domReady.js!", "/javascripts/game-shim.js", "/javascripts/goom-client.js", "/javascripts/bean.js"], function(domReady, shims, GoomClient, bean) {
	var stats = new Stats();
	var canvas_holder = document.getElementById("goom");
	var connection = canvas_holder.getAttribute("data-connection");
	// Align top-left
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.left = '0px';
	stats.domElement.style.top = '0px';
	document.body.appendChild(stats.domElement);
	document.getElementsByTagName('body')[0].appendChild(stats.domElement);

	var gameserver_socket = io.connect(connection);
	var gameClient, last = new Date();

	gameClient = new Client({"canvas_holder_id": "goom", "width": "860", "height": "480" },
		function(event) { gameserver_socket.emit("event", event); });

	gameClient.setDrawCallback(function(now) {
		stats.begin();
		gameClient.update(now - last);
		last = now;
		stats.end();
	});

	gameserver_socket.on('connect', function (data) {});

	gameserver_socket.on("event", function(event) {
		gameClient.receiveEvent(event);
	});

	gameserver_socket.on("disconnect", function (data) {
		gameserver_socket.disconnect();
	});


	bean.add(document.body, "keydown", function(e) {
		switch(e.which) {
			case 37:
			case 68:
				gameserver_socket.emit("event", {"type": "input", "value": "left"});
				break;
			case 39:
			case 65:
				gameserver_socket.emit("event", {"type": "input", "value": "right"});
				break;
			case 38:
			case 87:
				gameserver_socket.emit("event", {"type": "input", "value": "up"});
				break;
			case 83:
			case 40:
				gameserver_socket.emit("event", {"type": "input", "value": "down"});
				break;
			default: break;
		}
	});

	bean.add(document.body, "keyup", function(e) {
		switch(e.which) {
			case 37:
			case 68:
				gameserver_socket.emit("event", {"type": "input", "value": "left_up"});
				break;
			case 39:
			case 65:
				gameserver_socket.emit("event", {"type": "input", "value": "right_up"});
				break;
			case 38:
			case 87:
				gameserver_socket.emit("event", {"type": "input", "value": "up_up"});
				break;
			case 83:
			case 40:
				gameserver_socket.emit("event", {"type": "input", "value": "down_up"});
				break;
			default: break;
		}
	});
});