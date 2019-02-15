# InstiMap Web

[![InstiApp](https://insti.app/instiapp-badge-gh.svg)](https://insti.app/map)
[![License](https://img.shields.io/github/license/pulsejet/instimapweb.svg?style=flat)](https://github.com/pulsejet/instimapweb/blob/master/LICENSE.md)

JavaScript implementation of InstiMap for InstiApp

## Installation
Install in your project as `npm install instimapweb`

## API
The following important calls are available
* `getMap` - Construct and get the map from locations. This is supposed to be called only once
* `getGPS` - Try to get a watch on geolocation
* `moveToLocation` - Move the marker to an `ILocation`
* `moveMarker` - Move the marker to a location
* `cleanup` - Clear geolocation watch if any
* `setResidencesVisible` - set if residences are visible

## Configuration
`getMap` takes as the first argument a configuration as follows:
```
mapPath: string;
mapMinPath: string;
markersBase: string;
attributions: string;
map_id: string;
marker_id: string;
user_marker_id: string;
```

## License
Peremissively licensed under MIT License.

**Note** The map used in the app is not distributed under this license, please contact [Prof. Mandar Rane](http://www.mrane.com/) for using/distributing the map in any format.
