strd = '' + (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear();
td = new Date(strd);
let $sd, $ed;
let bmap, bmapinit = false;

$(document).ready(function() {
	$sd = $('#sd').datepicker({
		change: function(e) {
			let sd = new Date($sd.value());
			if(sd > td) {
				$sd.value(strd);
			}
		}
	});
	$ed = $('#ed').datepicker({
		change: function(e) {
			let ed = new Date($ed.value());
			if(ed > td) {
				$ed.value(strd);
			}
		}
	});

	// Initializing to today's date
	$sd.value(strd);
	$ed.value(strd);
})
let pre, post;

let getMap = () => {
	let sd = $sd.value();
	let ed = $ed.value();
	let satellite = $('#satSelect')[0].value;
	if(new Date(sd) > new Date(ed)) {
		$('#searchSpinner4').html(`<p>Bad date ranges!</p>`);
		return;
	}
	let spinner = `
		<div class="spinner-border text-muted "></div>
	`;
	$('#searchSpinner4').html(spinner);
	if(!bmapinit) {
		loadMap2();
		bmapinit = true;
	}
	if(pre) {
		pre.remove();
	}
	if(post) {
		post.remove();
	}
	axios.post('/api/getmap', {
		sd,
		ed,
		satellite
	})
		.then(res => {
			let data = res.data;
			if(data.error) {
				$('#searchSpinner4').html(`<p>${data.error}</p>`);
			}
			post = L.tileLayer(`https://earthengine.googleapis.com/map/${data.postmapid}/{z}/{x}/{y}?token=${data.posttoken}`);
			post.addTo(bmap);
			pre = L.tileLayer(`https://earthengine.googleapis.com/map/${data.premapid}/{z}/{x}/{y}?token=${data.pretoken}`);
			pre.addTo(bmap);
			$('#searchSpinner4').html('');
		})
}

let loadMap2 = () => {
	/*
	------------------------------------------------------------
		Loading the Map
	------------------------------------------------------------
	*/

	var base = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
		attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
		maxZoom: 18,
		id: 'mapbox.streets', // change 'streets' to 'satellite' for satellite base layer
		accessToken: mapboxkey
	});
	/*
	var OSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
	});
	*/
	bmap = L.map('bmap', {
		center: [26.40, 90.619],
		zoom: 8,
		layers: [base] // Change default map here
	});
	/* For adding multiple base layers
	var baseMaps = {
		"streets": streets,
		"satellite": satellite
	};
	L.control.layers(baseMaps, null).addTo(mymap);
	*/
}

let getStates = () => {
	axios.get('/api/states')
		.then(res => {
			let states = res.data;
			let template = `
					<% states.forEach(state => { %>
						<option><%= state %></option>
					<% }) %>
				`;
			let html = ejs.render(template, {states: states});
			$('#stateSelect').html(html);
		})
}