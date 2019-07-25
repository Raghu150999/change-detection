const router = require('express').Router();
const Location = require('../models/s1SceneMeta');
const ee = require('@google/earthengine');
const Utils = require('./../utils/utils');
const s1SceneMeta = require('./../models/s1SceneMeta');
const Scene = require('./../models/Scene');
const s2SceneMeta = require('./../models/s2SceneMeta');


// Passing app object from index.js (contains app.locals.trained (trained classifier))

module.exports = function(app) {
	
	// url: /api
	const sentinel1 = require('./sentinel1')(app);
	const alert = require('./alert');
	const sentinel2 = require('./sentinel2');
	router.use('/sentinel1', sentinel1);
	router.use('/alert', alert);
	router.use('/sentinel2', sentinel2);

	// Get all states
	router.get('/states', (req, res) => {
		let m = new Map();
		s1SceneMeta.find({})
			.then(sceneMetas => {
				sceneMetas.forEach(sceneMeta => {
					m.set(sceneMeta.state, 1);
				})
				s2SceneMeta.find({})
					.then(sceneMetas => {
						sceneMetas.forEach(sceneMeta => {
							m.set(sceneMeta.state, 1);
						})
						let response = [];
						for(let k of m.keys()) {
							response.push(k);
						}
						res.send(response);
					})
			})
	})

	router.post('/getmap', (req, res) => {
		let sd = new Date(req.body.sd), ed = new Date(req.body.ed), satellite = req.body.satellite;
		sd.setDate(sd.getDate());
		ed.setDate(ed.getDate() + 1);
		sd = sd.getFullYear() + '-' + (sd.getMonth() + 1) + '-' + sd.getDate();
		ed = ed.getFullYear() + '-' + (ed.getMonth() + 1) + '-' + ed.getDate();
		var ind = ee.FeatureCollection("users/raghu15sep99/ind_shp");
		var promises = [];
		if(satellite == 'Sentinel 1') {
			var sentinel = Utils.getSentinel();
			preflood = sentinel.filterDate('2019-01-01', '2019-05-01');
			preflood = preflood.min();
			preflood = preflood.clipToCollection(ind);
			preflood = preflood.lt(-18).focal_median(100, 'circle', 'meters');
			preflood = preflood.updateMask(preflood.gt(0));
			promises.push(Utils.getMapId(preflood, 'pre'));

			var post = sentinel.filterDate(sd, ed);
			if(post.size().getInfo() == 0) {
				res.send({
					error: 'No data found'
				})
				return;
			}
			post = post.mosaic();
			post = post.clipToCollection(ind);
			post = post.lt(-16).focal_median(100, 'circle', 'meters');
			post = post.updateMask(post.gt(0));
			promises.push(Utils.getMapId(post, 'post'));
		} else {
			var sentinel = ee.ImageCollection('COPERNICUS/S2');
			var preflood = Utils.filterPreFlood(sentinel);
			preflood = preflood.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 15));
			preflood = preflood.map(function(image) {
				var ndwi = image.normalizedDifference(['B3', 'B8']);
				return ndwi;
				})
			preflood = preflood.max();
			preflood = preflood.clipToCollection(ind);
			preflood = preflood.gt(0.02);
			preflood = preflood.updateMask(preflood.gt(0));
			promises.push(Utils.getMapId(preflood, 'pre'));

			var post = sentinel.filterDate(sd, ed);
			if(post.size().getInfo() == 0) {
				res.send({
					error: 'No data found'
				})
				return;
			}
			post = post.mosaic();
			post = post.clipToCollection(ind);
			var cloudmask = post.select('QA60').unmask().eq(0);
			post = post.normalizedDifference(['B3', 'B8']);
			post = post.gt(0.02);
			post = post.and(cloudmask);
			post = post.updateMask(post.gt(0));
			promises.push(Utils.getMapId(post, 'post'));
		}
		Promise.all(promises).then(function() {
			let data = {
				premapid: arguments[0][0].mapid,
				pretoken: arguments[0][0].token,
				postmapid: arguments[0][1].mapid,
				posttoken: arguments[0][1].token
			}
			res.send(data);
		});
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
				console.log('sceneMeta no:', index);
				var s2 = ee.ImageCollection("COPERNICUS/S2");
				var point = ee.Geometry.Point(sceneMeta.point);
				s2 = s2.filter(ee.Filter.eq('SENSING_ORBIT_NUMBER', sceneMeta.orbit)).filterBounds(point);
				s2 = s2.sort('system:time_start', false);
				var scenesAcquired = sceneMeta.scenesAcquired;
				var list = s2.toList(600);
				var len = list.length().getInfo();
				console.log('len: ', len);
				if(len > scenesAcquired) {
					let scenes = sceneMeta.scenes;
					for(var i = 0; i < len - scenesAcquired; i++) {
						console.log(i);
						var image = ee.Image(list.get(i));
						var id = image.id().getInfo();
						var date = id[0] + id[1] + id[2] + id[3] + '-' + id[4] + id[5] + '-' + id[6] + id[7];
						date = new Date(date);
						var footprint = image.geometry().coordinates().getInfo();
						footprint[0].forEach(coordinates => {
							let tmp = coordinates[0];
							coordinates[0] = coordinates[1];
							coordinates[1] = tmp;
						})
						let scene = new Scene({
							sceneMetaID: sceneMeta._id,
							locationName: sceneMeta.locationName,
							sceneID: image.id().getInfo(),
							collectionID: 'COPERNICUS/S2',
							acquisitionDate: date,
							footprint
						})
						scenes.push(scene);
						scenesAcquired = len;
					}
					s2SceneMeta.findOneAndUpdate({_id: sceneMeta._id}, { $set: {scenes: scenes, scenesAcquired: scenesAcquired} })
							.then(result => {
								console.log('saved');
							})
				}
			})
		})
		res.send('ok');
	});

	

	router.get('/ups1meta', (req, res) => {
		let s1SceneMetas = [];
		s1SceneMetas.push({
			state: 'Assam',
			locationName: 'Dhubri',
			point: [90.24574382968297, 25.582548852396627],
			rons: [150, 150],
			scenesAcquired: 0,
			scenes: []
		});
		s1SceneMetas.push({
			state: 'Assam',
			locationName: 'Guwahati',
			point: [91.91566570468297, 26.588986751309925],
			rons: [41, 41],
			scenesAcquired: 0,
			scenes: []
		})
		s1SceneMetas.push({
			state: 'Assam',
			locationName: 'Tezpur',
			point: [93.98658855624547, 26.878439253018946],
			rons: [143, 143],
			scenesAcquired: 0,
			scenes: []
		})
		s1SceneMetas.push({
			state: 'Assam',
			locationName: 'Dibrugarh',
			point: [95.56312664218297, 27.430745913757196],
			rons: [70, 70],
			scenesAcquired: 0,
			scenes: []
		})
		s1SceneMetas.push({
			state: 'Bihar',
			locationName: 'Patna',
			point: [86.13685711093297, 25.622179379924304],
			rons: [121, 121],
			scenesAcquired: 0,
			scenes: []
		})
		s1SceneMetas.push({
			state: 'Bihar',
			locationName: 'Siwan',
			point: [84.21974285312047, 26.096716470427033],
			rons: [19, 19],
			scenesAcquired: 0,
			scenes: []
		})
		s1SceneMetas.push({
			state: 'UP',
			locationName: 'Lucknow',
			point: [81.93458660312047, 26.932323373664165],
			rons: [56, 56],
			scenesAcquired: 0,
			scenes: []
		})
		s1SceneMetas.push({
			state: 'UP',
			locationName: 'Muzaffarnagar',
			point: [78.57277019687047, 29.363474967925413],
			rons: [63, 63],
			scenesAcquired: 0,
			scenes: []
		})
		s1SceneMetas.push({
			state: 'Punjab',
			locationName: 'Ludhiana',
			point: [76.48536785312047, 30.95449861944583],
			rons: [27, 27],
			scenesAcquired: 0,
			scenes: []
		})
		s1SceneMetas.push({
			state: 'Punjab',
			locationName: 'Amritsar',
			point: [75.07911785312047, 31.58365289355127],
			rons: [34, 34],
			scenesAcquired: 0,
			scenes: []
		})
		s1SceneMetas.forEach(sceneMeta => {
			let newsceneMeta = new s1SceneMeta({
				...sceneMeta
			});
			newsceneMeta.save()
				.then(result => {
					console.log('scenemeta saved');
				})
		})
		res.send('Updated s1 meta');
	})


	router.get('/ups2meta', (req, res) => {
		let s2SceneMetas = [];
		s2SceneMetas.push({
			state: 'Assam',
			locationName: 'Chapar',
			point: [90.62462490634437, 26.608569362603376],
			orbit: 133,
			scenesAcquired: 0,
			scenes: []
		})
		s2SceneMetas.push({
			state: 'Assam',
			locationName: 'Nalbari',
			point: [91.52550381259437, 26.537332369543954],
			orbit: 133,
			scenesAcquired: 0,
			scenes: []
		})
		s2SceneMetas.push({
			state: 'Assam',
			locationName: 'Tezpur',
			point: [92.45934170321937, 26.63066838281499],
			orbit: 133,
			scenesAcquired: 0,
			scenes: []
		})
		s2SceneMetas.push({
			state: 'Assam',
			locationName: 'Dhubri',
			point: [90.55870693759437, 25.609731160857915],
			orbit: 133,
			scenesAcquired: 0,
			scenes: []
		})
		s2SceneMetas.push({
			state: 'Assam',
			locationName: 'Guwahati',
			point: [91.53099697665687, 25.693911159393856],
			orbit: 133,
			scenesAcquired: 0,
			scenes: []
		})
		s2SceneMetas.push({
			state: 'Assam',
			locationName: 'Gohpur',
			point: [93.55797451571937, 26.74600489500688],
			orbit: 90,
			scenesAcquired: 0,
			scenes: []
		})
		s2SceneMetas.push({
			state: 'Assam',
			locationName: 'Jorhat',
			point: [94.53575771884437, 26.608569362603525],
			orbit: 90,
			scenesAcquired: 0,
			scenes: []
		})
		s2SceneMetas.push({
			state: 'Assam',
			locationName: 'Dibrugarh',
			point: [94.57970303134437, 27.66446024062424],
			orbit: 90,
			scenesAcquired: 0,
			scenes: []
		})
		s2SceneMetas.push({
			state: 'Assam',
			locationName: 'Dibrugarh',
			point: [94.57970303134437, 27.66446024062424],
			orbit: 90,
			scenesAcquired: 0,
			scenes: []
		})
		s2SceneMetas.forEach(sceneMeta => {
			let newsceneMeta = new s2SceneMeta({
				...sceneMeta
			});
			newsceneMeta.save()
				.then(result => {
					console.log('scenemeta saved');
				})
		})
		res.send('Updated s2 meta');
	})

	router.get('/updatedb', (req, res) => {
		
		s1SceneMeta.find({})
		.then(sceneMetas => {
			console.log('Sentinel1');
			var sentinel = Utils.getSentinel();
			sceneMetas.forEach((sceneMeta, index) => {
				console.log('s1: ', index);
				var point = ee.Geometry.Point(sceneMeta.point);
				var coll = sentinel.filter(ee.Filter.eq('relativeOrbitNumber_start', sceneMeta.rons[0]))
					.filter(ee.Filter.eq('relativeOrbitNumber_stop', sceneMeta.rons[1]))
					.filterBounds(point);
				// Sorts in descending order of time
				coll = coll.sort('system:time_start', false);
				var list = coll.toList(500);
				var len = list.length().getInfo();
				var scenesAcquired = sceneMeta.scenesAcquired;
				var scenes = sceneMeta.scenes;
				if(len > scenesAcquired) {
					console.log('Images to be added', len - scenesAcquired);
					for(var i = len - scenesAcquired - 1; i >= 0; i--) {
						console.log(i);
						var image = ee.Image(list.get(i));
						var id = image.id().getInfo();
						var acquisitionDate = Utils.getDate(id);
						var sceneMetaID = sceneMeta._id;
						var locationName = sceneMeta.locationName;
						var sceneID = id;
						var footprint = image.geometry().coordinates().getInfo();
						footprint[0].forEach(coordinates => {
							let tmp = coordinates[0];
							coordinates[0] = coordinates[1];
							coordinates[1] = tmp;
						})
						var scene = new Scene({
							acquisitionDate,
							sceneMetaID,
							locationName,
							sceneID,
							footprint,
							point: sceneMeta.point
						});
						scenes.push(scene);
					}
					scenesAcquired = len;
					console.log('Added all scenes for scene meta');
					s1SceneMeta.findOneAndUpdate({_id: sceneMeta._id}, {$set: {scenes: scenes, scenesAcquired}})
						.then(result => {
							console.log('s1 db updated');
						})
				}
			})
			console.log('s1 data updated');
		})
		s2SceneMeta.find({})
			.then(sceneMetas => {
				console.log('S2 initiated');
				var sentinel = ee.ImageCollection('COPERNICUS/S2');
				sceneMetas.forEach((sceneMeta, index) => {
					console.log('s2: ', index);
					var point = ee.Geometry.Point(sceneMeta.point);
					var coll = sentinel.filter(ee.Filter.eq('SENSING_ORBIT_NUMBER', sceneMeta.orbit))
						.filterBounds(point);
					// Sorts in descending order of time
					coll = coll.sort('system:time_start', false);
					var list = coll.toList(500);
					var len = list.length().getInfo();
					var scenesAcquired = sceneMeta.scenesAcquired;
					var scenes = sceneMeta.scenes;
					if(len > scenesAcquired) {
						console.log('Images to be added', len - scenesAcquired);
						for(var i = len - scenesAcquired - 1; i >= 0; i--) {
							console.log(i);
							var image = ee.Image(list.get(i));
							var id = image.id().getInfo();
							var d = id[0] + id[1] + id[2] + id[3] + '-' + id[4] + id[5] + '-' + id[6] + id[7];
							var acquisitionDate = new Date(d);
							var sceneMetaID = sceneMeta._id;
							var locationName = sceneMeta.locationName;
							var sceneID = id;
							var footprint = image.geometry().coordinates().getInfo();
							footprint[0].forEach(coordinates => {
								let tmp = coordinates[0];
								coordinates[0] = coordinates[1];
								coordinates[1] = tmp;
							})
							var collectionID = 'COPERNICUS/S2';
							var scene = new Scene({
								acquisitionDate,
								sceneMetaID,
								locationName,
								sceneID,
								footprint,
								collectionID,
								point: sceneMeta.point
							});
							scenes.push(scene);
						}
						scenesAcquired = len;
						s2SceneMeta.findOneAndUpdate({_id: sceneMeta._id}, {$set: {scenes: scenes, scenesAcquired}})
							.then(result => {
								console.log('s2 db updated');
							})
					}
				})
				console.log('s2 data updated');
			})
		res.send('Request received, please check the console and wait for success message');
	})
	return router;
}