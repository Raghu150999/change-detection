const router = require('express').Router(); 
const Utils = require('./../utils/utils');
const Location = require('./../models/location');
const ee = require('@google/earthengine');
const ejs = require('ejs');

module.exports = function(app) {
	router.post('/getdata', (req, res) => {
		let sd = req.body.start_date;
		let ed = req.body.end_date;
		sd = new Date(sd);
		ed = new Date(ed);
		sd = sd.getFullYear() + '-' + (sd.getMonth() + 1) + '-' + sd.getDate();
		ed = ed.getFullYear() + '-' + (ed.getMonth() + 1) + '-' + ed.getDate();
		let locationName = req.body.locationName;
		// @todo handle request for all locations
		if (locationName == 'Choose a location') {
			res.send('Invalid request');
		}
		Location.findOne({locationName})
		.then(location => {
			let statics = [];
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
										console.log('sar');
										let data = {
											sar_url: url,
											date,
											locationName
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
				arguments[0].forEach((data, index) => {
					data.id = index;
					ejs.renderFile(__dirname + '/../views/partials/card.ejs', data, (err, str) => {
						html += '\n';
						html += str;
					});
				})
				res.send(html);
			})
		})
	})
	return router;
}