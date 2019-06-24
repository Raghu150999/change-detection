// Front-end script file for search.ejs template

// Date() to formatted Date conversion
let d = new Date();
let strd = '' + (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear();
let td = new Date(strd);
let $start_date, $end_date;
let cache; // Cached data variable

$(document).ready(function() {
	$start_date = $('#start_date').datepicker({
		change: function(e) {
			let sd = new Date($start_date.value());
			if(sd > td) {
				$start_date.value(strd);
			}
		}
	});
	$end_date = $('#end_date').datepicker({
		change: function(e) {
			let ed = new Date($end_date.value());
			if(ed > td) {
				$end_date.value(strd);
			}
		}
	});

	// Initializing to today's date
	$start_date.value(strd);
	$end_date.value(strd);
	
	// datepicker value to Date() conversion
	// console.log(new Date($start_date.value()))

	// Http Request to get locations
	let xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if(this.readyState == 4 && this.status == 200) {
			locations = JSON.parse(this.responseText);

			// Use '%' twice to escape ejs inside ejs
			let template = `
					<option selected>Choose a location</option>
					<% locations.forEach(location => { %>
						<option><%= location.locationName %></option>
					<% }) %>
				`;
			let html = ejs.render(template, {locations: locations});
			$('#locationSelect').html(html)
		}
	}
	xhttp.open('GET', '/api/locations', true);
	xhttp.send();
})

let handleSubmit = () => {
	let sd = $start_date.value();
	let ed = $end_date.value();
	if(sd > ed) {
		let template = `
			<div class="toast" role="alert" aria-live="assertive" aria-atomic="true" style="position: absolute; top: 0; right: 0; z-index: 1; width: 400px;">
				<div class="toast-header">
					<strong class="mr-auto">Error</strong>
					<small class="text-muted">just now</small>
					<button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
						<span aria-hidden="true">&times;</span>
					</button>
				</div>
				<div class="toast-body">
					Invalid Date field values!
				</div>
			</div>
		`;
		$('#alert-toast').html(template)
		$('.toast').toast({
			autohide: false
		});
		$('.toast').toast('show');
	} else {
		let data = {
			start_date: sd,
			end_date: ed,
			locationName: $('#locationSelect')[0].value
		};
		axios.post('/api/flood/getdata', data)
			.then(res => {
				let html = `<div class = "collection">` + res.data.html + `</div>`
				$('#flood').html(html);
				cache = res.data.data;
			});
	}
}

let viewTile = (id) => {
	id = Number(id);
	let data = cache[id];
	axios.post('/api/flood/tile', data)
		.then(res => {
			let data = res.data;
			let template = `
			<div class="container-fluid">
				<a href="<%= sar_url %>" class="btn btn-primary" target="_blank">
				<i class="fa fa-download" aria-hidden="true"></i><span> </span>Download SAR (jpeg)</a>
				<br><br>
				<a href="<%= classified_url %>" class="btn btn-primary" target="_blank">
				<i class="fa fa-download" aria-hidden="true"></i><span> </span>Download Classified Layer (jpeg)</a>
				<br><br>
				<a href="<%= kml_url %>" class="btn btn-primary">
				<i class="fa fa-download" aria-hidden="true"></i><span> </span>Download Layer (kml)</a>
				<br><br>
			</div>
			`;
			let html = ejs.render(template, data);
			$('#modalBody').html(html);
			$('#dmodal').modal();
		})
}