const router = require('express').Router(); 
const Utils = require('../utils/utils');
const ee = require('@google/earthengine');
const ejs = require('ejs');
const SceneMeta = require('./../models/s1SceneMeta');

// /api/flood

module.exports = function(app) {
	router.post('/getdata', (req, res) => {
		let sd = req.body.start_date;
		let ed = req.body.end_date;
		sd = new Date(sd);
		ed = new Date(ed);
		ed.setDate(ed.getDate() + 2);
		let state = req.body.state;
		var sentinel = Utils.getSentinel();
		SceneMeta.find({state})
		.then(sceneMetas => {
			if(sceneMetas == null) {
				var html = `
				<h2 style="margin: 1rem;" class="text-monospace">No products found!</h2>
				`;
				res.send({
					html,
					data: []
				});
				return;
			}
			let promises = [];
			let metas = [];
			sceneMetas.forEach((sceneMeta, index) => {
				console.log('scenemeta: ', index);
				// Filter Scenes by query
				var scenes = Utils.getScenes(sceneMeta, sd, ed);
				var len = scenes.length;
				var point = ee.Geometry.Point(sceneMeta.point);
				
				// Get the preflood collection
				var preFloodColl = sentinel
					.filterBounds(point)
					.filter(ee.Filter.eq('relativeOrbitNumber_start', sceneMeta.rons[0]))
					.filter(ee.Filter.eq('relativeOrbitNumber_stop', sceneMeta.rons[0]));
				
				// Mosaic to get image
				preFloodColl = Utils.filterPreFlood(preFloodColl);
				var preFlood = preFloodColl.min(); // Taking the min back scatter values

				for(var i = 0; i < len; i++) {
					console.log('Image: ', i);
					var image = ee.Image('COPERNICUS/S1_GRD/' + scenes[i].sceneID).select('VV');
					var date = scenes[i].acquisitionDate;
					promises.push(Utils.getSarURL(image));
					var classified = Utils.getClassifiedForSAR(image, preFlood);
					promises.push(Utils.getClassifiedURLForSAR(classified));
					promises.push(Utils.getMapId(classified, 'classified'));
					let meta = {
						date,
						locationName: sceneMeta.locationName,
						sceneMetaID: sceneMeta._id,
						point: sceneMeta.point,
						footprint: scenes[i].footprint
					}
					metas.push(meta);
				}
			})
			console.log('completed');
			// Need to use classic functions (can't use arrow function. Error: arguments[0].forEach is not a function)
			Promise.all(promises).then(function () {
				console.log('finished');
				let html = '';
				let dataCollection = [];
				let len = arguments[0].length;
				for(var i = 0; i < len; i+=3) {
					let data = {
						id: i/3,
						...metas[i/3],
						base_url: arguments[0][i],
						classified_url: arguments[0][i+1],
						mapid: arguments[0][i+2].mapid,
						token: arguments[0][i+2].token
					}
					ejs.renderFile(__dirname + '/../views/partials/card.ejs', data, (err, str) => {
						html += str;
						html += '\n';
					});
					dataCollection.push(data);
				}
				if (dataCollection.length == 0) {
					html = `
						<h2 style="margin: 1rem;" class="text-monospace">No products found!</h2>
					`;
				}
				res.send({
					html,
					data: dataCollection
				});
			})
		})
	})

	router.post('/tile', (req, res) => {
		let data = req.body;
		let date = new Date(data.date);
		let sd = date;
		sd.setDate(sd.getDate() - 1);
		let ed = date;
		ed.setDate(ed.getDate() + 2);
		var sentinel = Utils.getSentinel();
		SceneMeta.findOne({_id: data.sceneMetaID})
			.then(sceneMeta => {
				var scenes = Utils.getScenes(sceneMeta, sd, ed);
				var image = ee.Image('COPERNICUS/S1_GRD/' + scenes[0].sceneID).select('VV');
				// Get the preflood collection
				var preFloodColl = sentinel
					.filterBounds(point)
					.filter(ee.Filter.eq('relativeOrbitNumber_start', sceneMeta.rons[0]))
					.filter(ee.Filter.eq('relativeOrbitNumber_stop', sceneMeta.rons[0]));
				
				var preFlood = Utils.getPreFlood(preFloodColl);
				var classified = Utils.getClassifiedForSAR(image, preFlood);
				Utils.getkmlURL(classified)
					.then(kml_url => {
						data.kml_url = kml_url;
						res.send(data);
					})
			})
	})

	router.get('/monthmosaic', (req, res) => {
		var sentinel = Utils.getSentinel();
		let date = new Date(req.query.date);
		date.setDate(date.getDate() + 1);
		let month = date.getMonth() + 1;
		let currmonth = month;
		let year = date.getFullYear();
		let locationName = req.query.locationName;
		let promises = [];
		let promise;
		let months = ['Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		Location.findOne({locationName})
			.then(result => {
				if(result == null) {
					var html = `
					<h2 style="margin: 1rem;" class="text-monospace">No products found!</h2>
					`;
					res.send({
						html,
						data: []
					});
					return;
				}
				var polygon = ee.Geometry.Polygon(result.mosaicPolygon);
				let sd = year + '-' + month + '-1';
				if(month < 12)
					month++;
				else {
					month = 1;
					year++;
				}
				let ed = year + '-' + month + '-1';
				var roiCollection = sentinel.filterBounds(polygon);
				var mosaic = ee.Image(roiCollection.filterDate(sd, ed).mosaic()); // @ min or mean ? 
				mosaic = mosaic.clip(polygon);
				promises.push(Utils.getSarURL(mosaic));
				var preFlood = Utils.getPreFlood(roiCollection);
				preFlood = preFlood.clip(polygon);
				classified = Utils.getClassifiedForSAR(mosaic, preFlood);
				promises.push(Utils.getClassifiedURLForSAR(classified));
				promise = Utils.getkmlURL(classified);
				promises.push(promise);
				Promise.all(promises).then(function() {
					let base_url = arguments[0][0];
					let classified_url = arguments[0][1];
					let kml_url = arguments[0][2];
					let period = months[currmonth-1] + ' ' + year;
					let data = {
						base_url,
						classified_url,
						kml_url,
						date,
						period,
						locationName
					};
					data.id = 1;
					let html;
					ejs.renderFile(__dirname + '/../views/partials/monthcard.ejs', data, (err, str) => {
							html = str;
						});
					data.html = html;
					res.send(data);
				})
			})
	})
	
	router.get('/halfyearly', (req, res) => {
		let year = req.query.year;
		let sd = year + '-' + '01-01';
		let ed = year + '-' + '07-01';
		var sentinel = Utils.getSentinel();
		let locationName = req.query.locationName;
		let promises = [];
		let promise;
		var trained = app.locals.trained;
		Location.findOne({locationName})
			.then(result => {
				var polygon = ee.Geometry.Polygon(result.mosaicPolygon);
				var roiCollection = sentinel.filterBounds(polygon).filterDate(sd, ed);
				var mosaic = roiCollection.mean();
				mosaic = mosaic.clip(polygon);
				promise = (image => {
					return new Promise((resolve, reject) => {
						image.getThumbURL(Utils.getImageVisParams('sar'), url => {
							resolve(url);
						})
					})
				})(mosaic);
				promises.push(promise);

				var classified = mosaic.classify(trained);
				promise = (image => {
					return new Promise((resolve, reject) => {
						image.getThumbURL(Utils.getImageVisParams('classified'), url => {
							resolve(url);
						})
					})
				})(classified);
				promises.push(promise);
				promises.push(Utils.getkmlURL(classified));
				sd = year + '-07-01';
				ed = year + '-12-31';
				roiCollection = sentinel.filterBounds(polygon).filterDate(sd, ed);
				var mosaic = roiCollection.min(); // Using min for post flood period
				mosaic = mosaic.clip(polygon);
				promise = (image => {
					return new Promise((resolve, reject) => {
						image.getThumbURL(Utils.getImageVisParams('sar'), url => {
							resolve(url);
						})
					})
				})(mosaic);
				promises.push(promise);
				var classified = mosaic.classify(trained);
				promise = (image => {
					return new Promise((resolve, reject) => {
						image.getThumbURL(Utils.getImageVisParams('classified'), url => {
							resolve(url);
						})
					})
				})(classified);
				promises.push(promise);
				promises.push(Utils.getkmlURL(classified));
				
				Promise.all(promises).then(function() {
					var dataCollection = [];
					period = 'Jan to Jun ' + year;
					let data = {
						base_url: arguments[0][0],
						classified_url: arguments[0][1],
						kml_url: arguments[0][2],
						period,
						locationName
					}
					data.id = 1;
					let html = '';
					dataCollection.push(data);
					ejs.renderFile(__dirname + '/../views/partials/yearcard.ejs', data, (err, str) => {
						html += str;
						html += '\n';
					});
					period = 'Jul to Dec ' + year;
					data = {
						base_url: arguments[0][3],
						classified_url: arguments[0][4],
						kml_url: arguments[0][5],
						period,
						locationName
					}
					data.id = 2;
					dataCollection.push(data);
					ejs.renderFile(__dirname + '/../views/partials/yearcard.ejs', data, (err, str) => {
						html += str;
					});
					let response = {
						data: dataCollection,
						html
					};
					res.send(response);
				})
			})
	})
	
	return router;
}