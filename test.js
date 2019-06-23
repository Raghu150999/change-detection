let promises = [];

for (var i = 0; i < 10; i++) {
	var promise = (function(i) {
		return new Promise(function(resolve, reject) {
			setTimeout(function() {
				console.log(i);
				resolve(i);
			}, 2000)
		})
	})(i)
	promises.push(promise);
}

Promise.all(promises).then(function() {
	for(var i = 0; i < 10; i++) {
		console.log('value', arguments[i]);
	}
})