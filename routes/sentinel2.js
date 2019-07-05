const router = require('express').Router(); 
const Utils = require('./../utils/utils');
const ee = require('@google/earthengine');
const ejs = require('ejs');
const scene = require('./../models/scene');
const s2SceneMeta = require('./../models/s2sceneMeta');

// /api/sentinel2

router.post('/getdata', (req, res) => {
	let sd = req.body.start_date;
	let ed = req.body.end_date;
	sd = new Date(sd);
	ed = new Date(ed);
	ed.setDate(ed.getDate() + 2);
	let locationName = req.body.locationName;
	s2SceneMeta.find({locationName})
		.then(sceneMetas => {
			let promises = [];
			let metas = [];
			sceneMetas.forEach(sceneMeta => {
				let scenes = sceneMeta.scenes;
				for(var i = 0; i < scenes.length; i++) {
					let date = scenes[i].acquisitionDate;
					if(date < sd || date > ed) {
						continue;
					}
					let imageID = scenes[i].collectionID + '/' + scenes[i].sceneID;
					var image = ee.Image(imageID);
					console.log(imageID);
					var metaData = {
						date,
						locationName,
						scene: scenes[i],
						footprint: sceneMeta.footprint,
						point: sceneMeta.point
					}
					metas.push(metaData);
					promises.push(Utils.getOpticalURL(image));
					var classified = Utils.getClassified(image, scenes[i].sceneID);
					promises.push(Utils.getClassifiedURL(classified));
				}
			})
			let dataCollection = [];
			Promise.all(promises).then(function() {
				let len = promises.length;
				let html = '';
				for(var i = 0; i < len; i+=2) {
					let data = {
						sar_url: arguments[0][i],
						classified_url: arguments[0][i+1],
						...metas[i/2]
					}
					data.id = i/2;
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
	let scene = data.scene;
	var imageID = scene.collectionID + '/' + scene.sceneID;
	var image = ee.Image(imageID);
	Utils.getkmlURLs2(image)
		.then(kml_url => {
			data.kml_url = kml_url;
			res.send(data);
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
			var roiCollection = sentinel.filterBounds(polygon).filterDate(sd, ed);
			var mosaic = ee.Image(roiCollection.mean()); // @ min or mean ? 
			mosaic = mosaic.clip(polygon);
			promise = (mosaic => {
				return new Promise((resolve, reject) => {
					mosaic.getThumbURL(Utils.getImageVisParams('sar'), url => {
						resolve(url);
					});
				})
			})(mosaic);
			promises.push(promise);
			var trained = app.locals.trained;
			var classified = mosaic.classify(trained);
			classified = classified.focal_median(300, 'circle', 'meters');
			promise = (image => {
				return new Promise((resolve, reject) => {
					image.getThumbURL(Utils.getImageVisParams('classified'), url => {
						resolve(url);
					})
				})
			})(classified)
			promises.push(promise);
			promise = Utils.getkmlURL(classified);
			promises.push(promise);
			Promise.all(promises).then(function() {
				let sar_url = arguments[0][0];
				let classified_url = arguments[0][1];
				let kml_url = arguments[0][2];
				let period = months[currmonth-1] + ' ' + year;
				let data = {
					sar_url,
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
					sar_url: arguments[0][0],
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
					sar_url: arguments[0][3],
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

module.exports = router;