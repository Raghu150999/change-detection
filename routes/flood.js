const router = require('express').Router(); 
const Utils = require('./../utils/utils');
const Location = require('./../models/location');
const ee = require('@google/earthengine');
const ejs = require('ejs');
const SceneMeta = require('./../models/sceneMeta');

// /api/flood

module.exports = function(app) {
	router.post('/getdata', (req, res) => {
		let sd = req.body.start_date;
		let ed = req.body.end_date;
		sd = new Date(sd);
		ed = new Date(ed);
		ed.setDate(ed.getDate() + 2);
		sd = sd.getFullYear() + '-' + (sd.getMonth() + 1) + '-' + sd.getDate();
		ed = ed.getFullYear() + '-' + (ed.getMonth() + 1) + '-' + ed.getDate();
		let locationName = req.body.locationName;
		var sentinel = Utils.getSentinel();
		Location.findOne({locationName})
		.then(location => {
			if(location == null) {
				var html = `
				<h2 style="margin: 1rem;" class="text-monospace">No products found!</h2>
				`;
				res.send({
					html,
					data: []
				});
			}
			let sceneMetas = location.sceneMetas;
			let promises = [];
			let metas = [];
			sceneMetas.forEach((sceneMeta, index) => {
				console.log('sc', index);
				var images = Utils.getImages(sceneMeta, sd, ed);
				var list = images.toList(200);
				var len = list.length().getInfo();
				var preFlood = Utils.getPreFlood(Utils.filterCollectionBySceneMeta(sentinel, sceneMeta));
				for(var i = 0; i < len; i++) {
					console.log(i);
					var image = ee.Image(list.get(i));
					var geometry = image.geometry();
					if (sceneMeta.isClipped) {
						geometry = ee.Geometry.Polygon(sceneMeta.geometry);
						image = image.clip(geometry);
					}
					var date = Utils.getDate(image.id().getInfo());
					promises.push(Utils.getSarURL(image));
					var classified = Utils.getClassifiedForSAR(image, preFlood);
					promises.push(Utils.getClassifiedURLForSAR(classified));
					promises.push(Utils.getMapId(classified, 'classified'));
					let promise = ((geometry) => {
						return new Promise((resolve, reject) => {
							geometry.coordinates().getInfo(arr => {
								// Swapping to convert from long-lat to lat-long
								arr[0].forEach(coordinates => {
									let tmp = coordinates[0];
									coordinates[0] = coordinates[1];
									coordinates[1] = tmp;
								});
								resolve(arr);
							})
						})
					})(geometry);
					promises.push(promise);
					let meta = {
						date,
						locationName,
						sceneMetaID: sceneMeta._id,
						point: sceneMeta.coordinates
					}
					metas.push(meta);
				}
			})
			console.log('c');
			// Need to use classic functions (can't use arrow function. Error: arguments[0].forEach is not a function)
			Promise.all(promises).then(function () {
				console.log('f');
				let html = '';
				let dataCollection = [];
				let len = arguments[0].length;
				for(var i = 0; i < len; i+=4) {
					let data = {
						id: i/4,
						...metas[i/4],
						base_url: arguments[0][i],
						classified_url: arguments[0][i+1],
						mapid: arguments[0][i+2].mapid,
						token: arguments[0][i+2].token,
						footprint: arguments[0][i+3]
					}
					ejs.renderFile(__dirname + '/../views/partials/card.ejs', data, (err, str) => {
						html += str;
						html += '\n';
					});
					dataCollection.push(data);
				}
				console.log(dataCollection);
				console.log(html);
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
		console.log(data.date);
		let date = new Date(data.date);
		date.setDate(date.getDate() - 1);
		let sd = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
		date.setDate(date.getDate() + 3);
		let ed = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
		var sentinel = Utils.getSentinel();
		SceneMeta.findOne({_id: data.sceneMetaID})
			.then(result => {
				var images = Utils.getImages(result, sd, ed);
				var image = images.first();
				var preFlood = Utils.getPreFlood(Utils.filterCollectionBySceneMeta(sentinel, result));
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