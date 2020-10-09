navigator.geolocation.getCurrentPosition = function(a, b) {
	a({
		coords: {
			latitude: 40.022061 + (Math.random()-0.5)*0.001,
			longitude: 116.472126 + (Math.random()-0.5)*0.001
		},
		timestamp: Date.now()
	})
}
