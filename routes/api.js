const router = require('express').Router();
const Location = require('./../models/location');
const SceneMeta = require('./../models/sceneMeta');

// Get all locations
router.get('/locations', (req, res) => {
  Location.find({})
		.then(result => {
			res.send(result);
		})
})

// Form submit and send data
router.post('/getdata', (req, res) => {
	console.log(req.body);
	let ed = new Date(req.body.end_date);
	ed.setDate(ed.getDate() + 2);
	res.send('ok');
})

router.get('/addlocation', (req, res) => {
	// Route for adding location see below for example
	/*
	let scenes = [];
	let sceneMeta = new SceneMeta({
		coordinates: [89.85, 25.81],
		rons: [150, 150],
		isClipped: false
	});
	sceneMeta.save();
	scenes.push(sceneMeta);
	sceneMeta = new SceneMeta({
		coordinates: [91.86, 26.23],
		rons: [41, 41],
		isClipped: true,
		geometry: [[[90.9014077589809, 25.0828462109107],
		[93.3348794386684, 25.495083168049966],
		[93.04728288250271, 26.976319149258675],
		[90.59996592382777, 26.574317062546598]]]
	});
	sceneMeta.save();
	scenes.push(sceneMeta);
	sceneMeta = new SceneMeta({
		coordinates: [93.77, 26.78],
		rons: [143, 143],
		isClipped: false
	});
	sceneMeta.save();
	scenes.push(sceneMeta);
	let location = new Location({
		locationName: 'Guwahati',
		sceneMetas: scenes
	});
	location.save()
		.then(result => {
			res.send('ok');
		})
	*/
	res.send('ok');
});

module.exports = router;
