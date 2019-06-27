const router = require('express').Router();
const Receiver = require('./../models/receiver');
const { check, validationResult } = require('express-validator');

// url: /api/alert

router.post('/addreceiver', [check('email', "Invalid Email").isEmail()], (req, res) => {
	var receiver = new Receiver({
		receiverEmail: req.body.email,
		password: req.body.password
	})
	var errors = validationResult(req);
	console.log(errors);
	if (!errors.isEmpty()) {
		console.log('Invalid email');
		res.send('Invalid Email');
	} else {
		Receiver.find({receiverEmail: req.body.email})
			.then(result => {
				if (result.length > 0) {
					res.send('Email is already registered');
				} else {
					receiver.save()
						.then(result => {
							res.send('ok');
						})
				}
			})
	}
})

router.post('/removereceiver', (req, res) => {
	Receiver.findOne({receiverEmail: req.body.email}).then(result => {
		if (result != null) {
			if (result.password === req.body.password) {
				Receiver.findOneAndDelete({receiverEmail: req.body.email})
					.then(result => {
						res.send('ok');
					})
			} else {
				res.send('Incorrect password');
			}
		} else {
			res.send('Email is not registered');
		}
	})
})

module.exports = router;