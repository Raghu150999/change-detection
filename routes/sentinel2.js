const router = require('express').Router(); 
const Utils = require('./../utils/utils');
const ee = require('@google/earthengine');
const ejs = require('ejs');
const SceneMeta = require('../models/s2SceneMeta');

// /api/sentinel2

router.post('/getdata', (req, res) => {
	let sd = req.body.start_date;
	let ed = req.body.end_date;
	sd = new Date(sd);
	ed = new Date(ed);
	ed.setDate(ed.getDate() + 2);
	let state = req.body.state;
	var sentinel = ee.ImageCollection("COPERNICUS/S2");
	SceneMeta.find({state})
		.then(sceneMetas => {
			let promises = [];
			let metas = [];
			sceneMetas.forEach(sceneMeta => {
				let scenes = Utils.getScenes(sceneMeta, sd, ed);
				var point = ee.Geometry.Point(sceneMeta.point);
				var preFloodColl = sentinel.filterBounds(point)
					.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 15))
					.filter(ee.Filter.eq('SENSING_ORBIT_NUMBER', sceneMeta.orbit));
				preFloodColl = Utils.filterPreFlood(preFloodColl);
				preFloodColl = preFloodColl.map(function(image) {
					var ndwi = image.normalizedDifference(['B3', 'B8']);
					return ndwi;
					})
				var preFlood = preFloodColl.max(); // Taking the max value for ndwi
				for(var i = 0; i < scenes.length; i++) {
					let imageID = scenes[i].collectionID + '/' + scenes[i].sceneID;
					var image = ee.Image(imageID);
					console.log(imageID);
					promises.push(Utils.getOpticalURL(image));
					var classified = Utils.getClassified(image, preFlood);
					promises.push(Utils.getMapId(classified, 'nd'));
					var metaData = {
						date: scenes[i].acquisitionDate,
						locationName: sceneMeta.locationName,
						scene: scenes[i],
						footprint: scenes[i].footprint,
						point: sceneMeta.point,
					}
					metas.push(metaData);
					promises.push(Utils.getClassifiedURL(classified));
				}
			})
			let dataCollection = [];
			Promise.all(promises).then(function() {
				let len = promises.length;
				let html = '';
				for(var i = 0; i < len; i+=3) {
					let data = {
						base_url: arguments[0][i],
						classified_url: arguments[0][i+2],
						...metas[i/3],
						mapid: arguments[0][i+1].mapid,
						token: arguments[0][i+1].token
					}
					data.id = i/3;
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
	Utils.getDownloadURL(image)
		.then(kml_url => {
			data.kml_url = kml_url;
			res.send(data);
		})
})

module.exports = router;