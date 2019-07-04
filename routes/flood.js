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
			let promise;
			// Get the trained classifier stored in app.locals
			var trained = app.locals.trained;
			sceneMetas.forEach((sceneMeta, index) => {
				console.log('sc', index);
				var images = Utils.getImages(sceneMeta, sd, ed);
				var list = images.toList(200);
				var len = list.length().getInfo();
				var idx = [];
				for(var i = 0; i < len; i++) {
					idx.push(i);
				}
				idx.forEach(i => {
					promise = (i => {
						return new Promise((resolve, reject) => {
							let promise;
							let promises = [];

							console.log(i);
							var image = ee.Image(list.get(i));
							var geometry = image.geometry();
							if (sceneMeta.isClipped) {
								geometry = ee.Geometry.Polygon(sceneMeta.geometry);
								image = image.clip(geometry);
							}
							var date = new Date(image.toDictionary().get('segmentStartTime').getInfo());
							promise = (image => {
								return new Promise((resolve, reject) => {
									image.getThumbURL(Utils.getImageVisParams('sar'), url => {
										console.log(date);
										let data = {
											sar_url: url,
											date,
											locationName,
											sceneMetaID: sceneMeta._id
										}
										resolve(data);
									})
								})
							})(image)
							promises.push(promise);

							image = image.classify(trained);
							image = image.focal_median(300, 'circle', 'meters');
							
							promise = (image => {
								return new Promise((resolve, reject) => {
									image.getThumbURL(Utils.getImageVisParams('classified'), url => {
										let data = {
											classified_url: url
										}
										resolve(data);
									})
								})
							})(image)
							promises.push(promise);


							Promise.all(promises).then(function () {
								let data = {
									...arguments[0][0],
									...arguments[0][1]
								}
								resolve(data);
							})
						})
					})(i);
					promises.push(promise);
				})
			})
			console.log('c');
			// Need to use classic functions (can't use arrow function. Error: arguments[0].forEach is not a function)
			Promise.all(promises).then(function () {
				console.log('f');
				let html = '';
				let dataCollection = [];
				arguments[0].forEach((data, index) => {
					data.id = index;
					ejs.renderFile(__dirname + '/../views/partials/card.ejs', data, (err, str) => {
						html += '\n';
						html += str;
					});
					dataCollection.push(data);
				})
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
		SceneMeta.findOne({_id: data.sceneMetaID})
			.then(result => {
				var images = Utils.getImages(result, sd, ed);
				image = images.first();
				var trained = app.locals.trained;
				var classified = image.classify(trained);
				classified = classified.focal_median(300, 'circle', 'meters');
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
	
	return router;
}