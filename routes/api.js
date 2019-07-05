const router = require('express').Router();
const Location = require('./../models/location');
const ee = require('@google/earthengine');
const Utils = require('./../utils/utils');
const Scene = require('./../models/scene');
const s2SceneMeta = require('./../models/s2sceneMeta');
const scene = require('./../models/scene');



// Passing app object from index.js (contains app.locals.trained (trained classifier))

module.exports = function(app) {
	
	// url: /api
	const flood = require('./flood')(app);
	const alert = require('./alert');
	const sentinel2 = require('./sentinel2');
	router.use('/flood', flood);
	router.use('/alert', alert);
	router.use('/sentinel2', sentinel2);

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
	
	router.get('/updatelocation',(req, res) => {
		var mosaicPolygon = [[[89.69234082173853, 24.015957508888174],
		[96.80049511861353, 26.302867434914017],
		[95.74580761861353, 28.988535193672025],
		[92.15489089327184, 27.834779381447245],
		[88.63765332173853, 26.745215103810708]]];
		Location.findOneAndUpdate({}, {mosaicPolygon})
			.then(result => {
				console.log('done');
				res.send('ok');
			})
	})

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
	})
	
	router.get('/addscene', (req, res) => {
		console.log('st');
		s2SceneMeta.find({})
		.then(result => {
			result.forEach((sceneMeta, index) => {
				let scene = sceneMeta.scenes[0];
				let imageID = scene.collectionID + '/' + scene.sceneID;
				var image = ee.Image(imageID);
				var geometry = image.geometry();
				var polygons = geometry.coordinates().getInfo();
				console.log(index);
				// Fliping longlats to latlongs
				polygons.forEach(polygon => {
					polygon.forEach(coordinates => {
						let tmp = coordinates[0];
						coordinates[0] = coordinates[1];
						coordinates[1] = tmp;
					})
				})
				s2SceneMeta.findOneAndUpdate({_id: sceneMeta._id}, { $set: {footprint: polygons} })
					.then(result => {
						console.log('done');
					})
			})
		})
		res.send('ok');
	});

	return router;
}