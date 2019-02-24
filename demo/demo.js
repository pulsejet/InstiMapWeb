const InstiMap = require('../dist/index.js');

fetch('locations.json')
  .then(function(response) {
    return response.json();
  })
  .then(function(jsonResponse) {
    InstiMap.getMap({
        mapPath: 'assets/map.jpg',
        mapMinPath: 'assets/map-min.jpg',
        markersBase: '/assets/map/',
        attributions:'<a href="http://mrane.com/" target="_blank">Prof. Mandar Rane</a>',
        map_id: 'map',
        marker_id: 'marker',
        user_marker_id: 'user-marker',
    }, jsonResponse, (location) => {
      console.log(location);
    }, () => {
      console.log('map loaded');
    });

    InstiMap.addOnUserFollowingChangeListener(val => {
      console.log(`Following user ${val}`);
    })
    InstiMap.getGPS();
  });
