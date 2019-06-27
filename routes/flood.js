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
		// @todo handle request for all locations
		if (locationName == 'Choose a location') {
			res.send('Invalid request');
		}
		Location.findOne({locationName})
		.then(location => {
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
				let trained = app.locals.trained;
				let geometry = image.geometry();
				image = image.classify(trained);
				image = image.focal_median(300, 'circle', 'meters');
				image = image.expression('b("classification") == 0 ? 1 : 0');
				image = image.updateMask(image.gt(0))
				image = image.clip(geometry)
				var vectors = image.reduceToVectors({
					scale: 400
				});
				var kml_url = vectors.getDownloadURL({
					format: 'kml',
					filename: 'layer'
				});
				data.kml_url = kml_url;
				res.send(data);
			})
	})
	return router;
}