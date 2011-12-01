var data,
	link,
	node;

//window.fbAsyncInit = function () {
FB.init({
	appId: '2345487916',
	status: true, // check login status
	cookie: true,
	xfbml: true
});

var loggedIn;
FB.getLoginStatus(function(response) {
	loggedIn = (response.status == "connected");
});

function loadDataLocal() {
	try {
		data = localStorage.friendgraphdata;
		if (!data) return;
		data = JSON.parse(data);
	} catch(e) {
		return;
	}
	graph();
}

function saveDataLocal() {
	if (!data || !window.localStorage) console.log('asdasd?>'); //return;
	localStorage.friendgraphdata = JSON.stringify(data);
	//console.log(localStorage.friendgraphdata.length);
}

//setTimeout(loadDataLocal, 10);

//d3.json("myfriends.json", gotDataFB);

var loader = d3.select("#loader");

var goBtn = d3.select("#go_btn").on("click", function () {
	if (loggedIn) {
		getFriendData();
	} else {
		FB.login(function(response) {
			if (response.status == "connected") {
				getFriendData();
			}
		});
	}
});

function getFriendData() {
	loader.style("display", "block");
	FB.api({
		method: 'fql.multiquery',
		queries: {
			friend_info: 'SELECT id, name, url, pic FROM profile WHERE'
		+ ' id IN (SELECT uid2 FROM friend WHERE uid1=me())',
		connections: 'SELECT uid1, uid2 FROM friend WHERE'
		+ ' uid1 IN (SELECT id FROM #friend_info) AND'
		+ ' uid2 IN (SELECT id FROM #friend_info)'
		}
	}, function (response) {
		loader.style("display", "none");
		if (response[0]) {
			gotDataFB([response[0].fql_result_set, response[1].fql_result_set]);
		} else if (reponse.error_code == 18) {
			error("Too many people are using the app right now. Try again tomorrow.");
		}
	});
}

var vis = d3.select("#graph svg");
var svg = vis.node();

var force = d3.layout.force()
	.charge(-180)
	.linkDistance(50)
	.gravity(0.4)
	.on("tick", tick);

var height, width;

function resizeGraph() {
	if (!data) return;
	width = window.innerWidth; //svg.offsetWidth;
	height = window.innerHeight; //svg.offsetHeight;
	force.size([width, height])
		.resume();
}
window.addEventListener("resize", resizeGraph, false);

function gotDataFB(d) {
	data = d;
	goBtn.remove();
	//saveDataLocal();
	graph();
}

var tooltip = vis.select("#tooltip");

function translate(d) {
	return d ? "translate(" + (d.x - 8) + "," + (d.y - 8) + ")" : null;
}

function updateTooltip(hovered) {
	// bring to front
	var name = hovered ? hovered.name : '';
	vis.node().appendChild(tooltip.node());
	tooltip.attr("transform", translate(hovered));
	tooltip.select(".name")
		.text(name)
	tooltip.select(".shadow")
		.text(name);
}

function graph() {
	var profiles = data[0];
	var connections = data[1];

	//setTimeout(saveDataLocal, 15000);

	//profiles = profiles.slice(0, 10);

	var profilesByUid = {};
	profiles.forEach(function (profile) {
		profilesByUid[profile.id] = profile;
	});

	var links = connections.map(function (connection) {
		return {
			source: profilesByUid[connection.uid1],
			target: profilesByUid[connection.uid2]
		};
	});

	resizeGraph();
	force
		.nodes(profiles)
		.links(links)
		.start();

	link = vis.selectAll("line.link")
		.data(links, function (d) { return d.source.id + ' ' + d.target.id; });
	
	link.enter().append("svg:line")
		.attr("class", "link");

	link.exit().remove();

	node = vis.selectAll("a.node")
		.data(profiles, function (d) { return d.id; });

	var newNode = node.enter().append("svg:a")
		.attr("class", "node")
		.call(force.drag);
	
	node.attr("xlink:href", function (d) { return d.url; });

	/*
	newNode.append("svg:title");
	var title = node.select("title");
	title.text(function(d) { return d.name; });
	*/

	newNode.append("svg:image")
		.attr("width", 16)
		.attr("height", 16)
		.attr("preserveAspectRatio", "xMidYMin slice")
		.on("mouseover", updateTooltip)
		.on("mouseout", function (d) { updateTooltip(null); });

	node.select("image")
		.attr("xlink:href", function (d) { return d.pic; });

	node.exit().remove();
}

function tick(e) {
	link.attr("x1", function(d) { return d.source.x; })
		.attr("y1", function(d) { return d.source.y; })
		.attr("x2", function(d) { return d.target.x; })
		.attr("y2", function(d) { return d.target.y; });

	node.attr("transform", translate);
}
