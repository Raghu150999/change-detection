const router = require('express').Router(); 
const Utils = require('./../utils/utils');
const ee = require('@google/earthengine');
const ejs = require('ejs');
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
					var geometry = image.geometry();
					promises.push(Utils.getOpticalURL(image));
					var classified = Utils.getClassified(image, scenes[i].sceneID);
					classified.clip(geometry);
					promises.push(Utils.getMapId(classified, 'nd'));
					var metaData = {
						date,
						locationName,
						scene: scenes[i],
						footprint: sceneMeta.footprint,
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