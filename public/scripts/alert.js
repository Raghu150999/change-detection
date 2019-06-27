let register = () => {
	let email = $('#emailInput').val(); // Returns the input field value
	let password = document.getElementById('passwordInput').value; // jQuery doesn't gets password
	let data = {
		email,
		password
	}
	if (email == '' || password == '') {
		let html = `
			<div class="alert alert-danger" role="alert">
				Email or password cannot be empty
			</div>
		`;
		$('#msg').html(html);
		return;
	}
	axios.post('/api/alert/addreceiver', data)
		.then(res => {
			let msg;
			let type;
			if (res.data == 'ok') {
				msg = 'Succesfully registered';
				type = 'success';
			} else if (res.data == 'Email is already registered') {
				msg = res.data;
				type = 'warning';
			} else {
				msg = res.data;
				type = 'danger';
			}
			let html = `
				<div class="alert alert-${type}" role="alert">
					${msg}
				</div>
			`;
			$('#msg').html(html);
		})
}

let remove = () => {
	let email = $('#emailInput').val(); // Returns the input field value
	let password = document.getElementById('passwordInput').value; // jQuery doesn't gets password
	let data = {
		email,
		password
	}
	if (email == '' || password == '') {
		let html = `
			<div class="alert alert-danger" role="alert">
				Email or password cannot be empty
			</div>
		`;
		$('#msg').html(html);
		return;
	}
	axios.post('/api/alert/removereceiver', data)
		.then(res => {
			let msg;
			let type;
			if (res.data == 'ok') {
				msg = 'Succesfully removed';
				type = 'success';
			} else if (res.data == 'Incorrect Password') {
				msg = res.data;
				type = 'danger';
			} else {
				msg = res.data;
				type = 'warning';
			}
			let html = `
				<div class="alert alert-${type}" role="alert">
					${msg}
				</div>
			`;
			$('#msg').html(html);
		})
}