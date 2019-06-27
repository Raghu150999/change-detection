const router = require('express').Router();
const Location = require('./../models/location');
const ee = require('@google/earthengine');
const Utils = require('./../utils/utils');

// Passing app object from index.js (contains app.locals.trained (trained classifier))

module.exports = function(app) {
	
	// url: /api
	const flood = require('./flood')(app);
	const alert = require('./alert');
	router.use('/flood', flood);
	router.use('/alert', alert);

	// Get all locations
	router.get('/locations', (req, res) => {
		Location.find({})
			.then(result => {
				res.send(result);
			})
	})

	router.get('/maps', (req, res) => {
		var trained = app.locals.trained;
		var sentinel = Utils.getSentinel();
		Location.find({}).then(result => {
			let sceneMeta = result[0].sceneMetas[0];
			var images = Utils.getImages(sceneMeta, '2018-07-14', '2018-07-15');
			var image = images.first();
			var geometry = image.geometry();
			// Viewing image and vector in maps
			image = image.classify(trained);
			image = image.focal_median(500, 'circle', 'meters');
			image = image.expression('b("classification") == 0 ? 1 : 0');
			image = image.updateMask(image.gt(0));
			image = image.clip(geometry);
			var vectors = image.reduceToVectors({
				scale: 400
			});
			vectors.getMap({color: '#0f4ae0'}, ({mapid, token}) => {
				res.render('maps/mapdemo', {mapid, token});
			});
			// for image
			// image.getMap(imageVisParam, ({mapid, token}) => {
			// 	res.render('maps/mapdemo', {mapid, token});
			// });
			// for kml file
			// var kmlfileURL = vectors.getDownloadURL({
			// 	format: 'kml'
			// })
			// res.send(kmlfileURL)
		})
	})
	/*
	router.get('/addlocation', (req, res) => {
		// Route for adding location see below for example
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
	});
	*/
	return router;
}