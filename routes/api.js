const router = require('express').Router();
const Location = require('./../models/location');
const ee = require('@google/earthengine');
const Utils = require('./../utils/utils');

// Passing app object from index.js (contains app.locals.trained (trained classifier))

module.exports = function(app) {
	
	const flood = require('./flood')(app);
	router.use('/flood', flood);

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


	router.get('/floodimage', (req, res) => {
		let sd = '2019-01-01';
		let ed = '2019-02-01';

		var sentinel = Utils.getSentinel();
		Location.find({})
						.then(result => {
							let sceneMetas = result[0].sceneMetas;
							let first = sceneMetas[0];
							// Prepare pre-flood collection
							var point = ee.Geometry.Point(first.coordinates);
							var pfc = sentinel.filterBounds(point)
																.filter(ee.Filter.eq('relativeOrbitNumber_start', first.rons[0]))
																.filter(ee.Filter.eq('relativeOrbitNumber_stop', first.rons[1]));
							var smic = pfc;
							var pfc_2016 = pfc.filterDate('2016-01-01', '2016-06-01');
							var pfc_2017 = pfc.filterDate('2017-01-01', '2017-06-01');
							var pfc_2018 = pfc.filterDate('2018-01-01', '2018-06-01');
							var pfc_2019 = pfc.filterDate('2019-01-01', '2019-06-01');
							var geometry = pfc_2019.first().geometry();
							pfc = pfc_2018.merge(pfc_2017)
														.merge(pfc_2016)
														.merge(pfc_2019);
							pfc = pfc.select('VV');
							var mean = pfc.mean();
							mean = mean.clip(geometry);

							// Get training image
							var image = smic.filterDate('2018-07-14', '2018-07-15').first();

							var dataset = ee.FeatureCollection("users/raghu15sep99/land_water_dataset");
							var imageVisParam = {
								bands: ['classification'], 
								min: 0,
								max: 1, 
								palette: ['68dae6', 'a5611b']
							}

							// Specifying bands used for classification
							var bands = ['VV'];
							image = image.select(bands);

							// Training dataset
							var training = image.sampleRegions({
								collection: dataset,
								properties: ['class'],
								scale: 30
							})

							// SVM Classifier
							var classifier = ee.Classifier.svm({
								kernelType: 'RBF',
								gamma: 0.5,
								cost: 10
							})

							// Training the classifier
							var trained = classifier.train(training, 'class', bands);
							mean = mean.classify(trained);

							// Classified pre-flood mean
							pfc = mean;

							var queryCollection = smic.filterDate(sd, ed);
							let list = queryCollection.toList(200);
							let len = list.length().getInfo();
							let response = [];
							for(var i = 0; i < len; i++) {
								var currimage = ee.Image(list.get(i));
								currimage = currimage.classify(trained);
								let jpgURL = currimage.getThumbURL(imageVisParam);
								let r = {
									jpgURL
								}
								response.push(r);
							}
							res.send(response);
						})
	})
	/*
	router.get('/addscene', (req, res) => {
		Location.find({})
			.then(result => {
				var sceneMetas = result[0].sceneMetas;
				var s1 = sceneMetas[0];
				var sentinel = ee.ImageCollection("COPERNICUS/S1_GRD");
				sentinel = sentinel.filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
													.filter(ee.Filter.eq('instrumentMode', 'IW'));
				var point = ee.Geometry.Point(s1.coordinates);
				var images = sentinel.filterBounds(point)
														.filter(ee.Filter.eq('relativeOrbitNumber_start', s1.rons[0]))
														.filter(ee.Filter.eq('relativeOrbitNumber_stop', s1.rons[1]));
				var list = images.toList(300);
				var len = images.toList(300).length().getInfo();
				var image = ee.Image(list.get(0));
				var date = new Date(image.toDictionary().get('segmentStartTime').getInfo());
				var dataset = ee.FeatureCollection("users/raghu15sep99/land_water_dataset");
				var imageVisParam = {
					bands: ['classification'], 
					min: 0,
					max: 1, 
					palette: ['68dae6', 'a5611b']
				}
				// Specifying bands used for classification
				var bands = ['VV'];
				image = image.select(bands);

				// Training dataset
				var training = image.sampleRegions({
					collection: dataset,
					properties: ['class'],
					scale: 30
				})

				// SVM Classifier
				var classifier = ee.Classifier.svm({
					kernelType: 'RBF',
					gamma: 0.5,
					cost: 10
				})

				// Training the classifier
				var trained = classifier.train(training, 'class', bands);

				// Performing classification using trained classifier
				var classified = image.classify(trained);

				// Morphological Smoothening
				classified = classified.focal_median(500, 'circle', 'meters');
				var sar_jpgURL = image.getThumbURL({min: -25, max: 0});
				var flood_jpgURL = classified.getThumbURL(imageVisParam);
				var sar_downloadURL = image.getDownloadURL({
					bands: [],
					scale: 50
				});
				var flood_downloadURL = classified.getDownloadURL({
					bands: [],
					scale: 30
				});
				let scene = new Scene({
					sceneMetaID: s1._id,
					locationID: result[0]._id,
					sar_jpgURL,
					sar_downloadURL,
					flood_jpgURL,
					flood_downloadURL,
					date,
					type: 'Flood'
				})
				scene.save()
					.then(result => {
						res.send('ok');
					});
			})
	})
	*/
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
	});
	return router;
}