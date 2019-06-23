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
		Location.findOne({locationName})
		.then(location => {
			var cnt = 0;
			let sar_urls = [];
			let classified_urls = [];
			let change_urls = [];
			let statics = [];
			let sceneMetas = location.sceneMetas;
			var trained = app.locals.trained;
			sceneMetas.forEach((sceneMeta, index) => {
				var images = Utils.getImages(sceneMeta, sd, ed);
				var list = images.toList(200);
				var len = list.length().getInfo();
				var idx = [];
				for(var i = 0; i < len; i++) {
					idx.push(i);
				}
				idx.forEach(i => {
					cnt += 3;
					var image = ee.Image(list.get(i));
					var geometry = image.geometry();
					if (sceneMeta.isClipped) {
						geometry = ee.Geometry.Polygon(sceneMeta.geometry);
						image = image.clip(geometry);
					}
					var date = new Date(image.toDictionary().get('segmentStartTime').getInfo());
					image.getThumbURL(Utils.getImageVisParams('sar'), url => {
						sar_urls.push(url);
						cnt--;
						if(cnt <= 0)
							response();
					});
					image = image.classify(trained);
					image = image.focal_median(300, 'circle', 'meters');
					
					image.getThumbURL(Utils.getImageVisParams('classified'), url => {
						classified_urls.push(url);
						cnt--;
						if(cnt <= 0)
							response();
					});
					
					var pfc_mean = Utils.getPreFlood(sceneMeta);
					pfc_mean = pfc_mean.classify(trained);
					pfc_mean = pfc_mean.focal_median(300, 'circle', 'meters');
					var diffimage = ee.Image().expression(
						'2 * B1 + B2 + 1', {
							'B1': pfc_mean.select('classification'),
							'B2': image.select('classification')
						});
					diffimage = diffimage.expression('b1 >= 1 ? b1 >= 2 ? b1 >= 3 ? b1 >= 4 ? 4 : 3 : 2 : 1 : 0', {
						'b1': diffimage.select('constant')
					});
					diffimage = diffimage.clip(geometry);
					
					diffimage.getThumbURL(Utils.getImageVisParams('diff'), url => {
						change_urls.push(url);
						cnt--;
						if(cnt <= 0)
							response();
					});
					let static = {
						date,
						locationName
					}
					statics.push(static)
				})
			})
			function response() {
				let html = '';
				sar_urls.forEach((item, index) => {
					let data = {
						sar_url: sar_urls[index],
						classified_url: classified_urls[index],
						change_url: change_urls[index],
						id: index,
						...statics[index]
					};
					ejs.renderFile(__dirname + '/../views/partials/card.ejs', data, (err, str) => {
						html += '\n';
						html += str;
					});
				})
				res.send(html);
			}
		})
	})
	return router;
}