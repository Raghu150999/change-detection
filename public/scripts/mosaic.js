let $month_picker;
let monthMosaic;

var displayError = () => {
	let html = `
		<div class="alert alert-danger alert-dismissible fade show" role="alert">
			Please specify a location
			<button type="button" class="close" data-dismiss="alert" aria-label="Close">
				<span aria-hidden="true">&times;</span>
			</button>
		</div>
	`;
	$('#msg2').html(html);
}

$(document).ready(() => {
	axios.get('/api/locations')
		.then(res => {
			let locations = res.data;
			let template = `
					<option selected>Choose a location</option>
					<% locations.forEach(location => { %>
						<option><%= location.locationName %></option>
					<% }) %>
				`;
			let html = ejs.render(template, {locations: locations});
			$('#mosaiclocationSelect').html(html);
		});
	$month_picker = $('#month-picker').datepicker();
	$month_picker.value(strd);
});

var monthSearch = () => {
	let date = new Date($month_picker.value());
	date = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
	let locationName = $('#mosaiclocationSelect')[0].value;
	if(locationName == 'Choose a location') {
		displayError();
		return;
	}
	let spinner = `
		<div class="spinner-border text-muted "></div>
	`;
	$('#searchSpinner3').html(spinner);
	axios.get('/api/flood/monthmosaic', {
		params: {
			locationName,
			date
		}
	})
		.then(res => {
			let data = res.data;
			let html = data.html;
			monthMosaic = data;
			$('#searchSpinner3').html('');
			$('#monthMosaic').html(html);
		})
}

var downloadLinks = () => {
	let template = `
		<div class="container-fluid">
			<a href="<%= base_url %>" class="btn btn-primary" target="_blank">
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
	let html = ejs.render(template, monthMosaic);
	$('#modalBody2').html(html);
	$('#dmodal2').modal();
}
let yearCache;

var getdata = (year) => {
	let locationName = $('#mosaiclocationSelect')[0].value;
	if(locationName == 'Choose a location') {
		displayError();
		return;
	}
	let spinner = `
		<div class="spinner-border text-muted "></div>
	`;
	$('#searchSpinner2').html(spinner);
	axios.get('/api/flood/halfyearly', {
		params: {
			year,
			locationName
		}
	})
		.then(res => {
			let response = res.data;
			yearCache = response.data;
			$('#halfyearlyMosaic').html(response.html);
			$('#searchSpinner2').html('');
		})
}

var downloadYearLinks = (id) => {
	console.log(id);
	id = Number(id);
	let template = `
		<div class="container-fluid">
			<a href="<%= base_url %>" class="btn btn-primary" target="_blank">
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
	let data = yearCache[id-1];
	let html = ejs.render(template, data);
	$('#modalBody3').html(html);
	$('#dmodal3').modal();
}

