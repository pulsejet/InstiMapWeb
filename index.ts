import OlMap from 'ol/Map';
import OlLayerImage from 'ol/layer/Image';
import OlView from 'ol/View';
import OlExtent from 'ol/extent';
import OlOverlay from 'ol/Overlay';
import OlLayerVector from 'ol/layer/Vector';
import OlSourceImageStatic from 'ol/source/ImageStatic';
import OlSourceVector from 'ol/source/Vector';
import OlProjProjection from 'ol/proj/Projection';
import OlFeature from 'ol/Feature';
import OlGeomPoint from 'ol/geom/Point';
import OlGeomPolygon from 'ol/geom/Polygon';
import OlStyleStyle from 'ol/style/Style';
import OlStyleIcon from 'ol/style/Icon';
import OlStyleText from 'ol/style/Text';
import OlStyleStroke from 'ol/style/Stroke';
import OlStyleFill from 'ol/style/Fill';
import OlInteraction from 'ol/interaction';

/** Model for location */
export interface ILocation {
  id: string;
  name: string;
  short_name: string;
  description: string;
  parent: string;
  parent_relation: string;
  group_id: number;
  pixel_x: number;
  pixel_y: number;
  lat: number;
  lng: number;
  reusable: boolean;
}

/** Configuration */
export interface InstiMapConfig {
  mapPath: string;
  mapMinPath: string;
  markersBase: string;
  attributions: string;
  map_id: string;
  marker_id: string;
  user_marker_id: string;
}
let _config: InstiMapConfig;

/** Internal map obects */
let map: OlMap;
let view: OlView;
let vectorLayer: OlLayerVector;
let imlayer: OlLayerImage;
let imExtent: any;
let imProjection: OlProjProjection;

/** Attributions to show on map */
let attributions: string;

/** GPS following */
let followingUser = false;

/** Geolocation id of watch */
let geoLocationId: number;

/** Last known geolocation */
let geoLocationLast: { pixel_x: number, pixel_y: number};

/** Whether to show residences on map */
let showResidences = false;

/** Model to convert lat-lng to pixel coords */
const MAP_Xn = 19.133691;
const MAP_Yn = 72.916984;
const MAP_Zn = 4189;
const MAP_Zyn = 1655;

const MAP_WEIGHTS_X: number[] = [
    -7.769917472065843,
    159.26978694839946,
    244.46989575495544,
    -6.003894110679995,
    -0.28864271213341297,
    0.010398324019718075,
    4.215508849724247,
    -0.6078830146963545,
    -7.0400449629241395
];

const MAP_WEIGHTS_Y = [
    14.199431377059842,
    -158.80601990819815,
    68.9630034040724,
    5.796703402034644,
    1.1348242200568706,
    0.11891051684489184,
    -0.2930832938484276,
    0.1448231125788526,
    -5.282895700923075
];

/** Make and get the map. Call only once. */
export function getMap(
  config: InstiMapConfig,
  locations: ILocation[],
  locationSelectCallback: (location?: ILocation) => void
): OlMap {

  _config = config;

  /* Make features array */
  const features = [];
  for (const loc of locations) {
    /* Change coordinate sysetm */
    const pos: [number, number] = [loc.pixel_x, 3575 - loc.pixel_y];

    /* Ignore inner locations */
    if (loc.parent === null) {
      /* Make the Feature */
      const iconFeature = new OlFeature({
        geometry: new OlGeomPoint(pos),
        loc: loc
      });

      /* Push into array */
      features.push(iconFeature);
    }
  }

  /* Make vector source and layer from features */
  const vectorSource = new OlSourceVector({
    features: features
  });

  /* Style the vector layer */
  const vectorLayerStyle = (feature: any): any => {
    const zoom = map.getView().getZoom();
    const loc = feature.get('loc');

    /* Hide residences */
    if (loc.group_id === 3 && !showResidences) {
      return;
    }

    /* Increase font size with zoom */
    const font_size = zoom * 3;

    /* Choose short name if present */
    let loc_name = loc.name;
    if (loc.short_name !== '0') {
      loc_name = loc.short_name;
    }

    /* Choose icon color based on group id */
    let icon_color;
    if (loc.group_id === 1 || loc.group_id === 4 || loc.group_id === 12) {
      icon_color = 'blue';
    } else if (loc.group_id === 3) {
      icon_color = 'green';
    } else if (loc.group_id === 2) {
      icon_color = 'yellow';
    } else {
      icon_color = 'gray';
    }

    /* Make text object */
    const text = new OlStyleText({
      offsetY: 20,
      padding: [20, 20, 20, 20],
      font: `${font_size}px Roboto`,
      text: loc_name,
      fill: new OlStyleFill({
        color: '#ffffff'
      }),
      stroke: new OlStyleStroke({
        color: '#444', width: 3
      })
    });

    /* Icon image*/
    const icon = new OlStyleIcon({
      src: `${_config.markersBase}marker_dot_${icon_color}.png`,
      scale: 0.2
    });

    /* Make style */
    const style = new OlStyleStyle({
      image: (zoom >= 3) ? icon : undefined,
      text: (zoom >= 4) ? text : undefined,
    });
    return [style];
  };

  vectorLayer = new OlLayerVector({
    source: vectorSource,
    style: vectorLayerStyle
  });

  /* Configure map */
  imExtent = [0, 0, 5430, 3575];
  imProjection = new OlProjProjection({
    code: 'instiMAP',
    units: 'pixels',
    extent: imExtent
  });

  const staticSource = new OlSourceImageStatic({
    url: config.mapMinPath,
    attributions: attributions,
    projection: imProjection,
    imageExtent: imExtent,
    imageLoadFunction: (image: any, src: string) => {
      /* For showing loading spinner */
      const img: any = image.getImage();
      img.src = src;
      img.onload = () => {
        loadHighRes();
      };
    }
  });

  /* Make image layer */
  imlayer = new OlLayerImage({
    source: staticSource
  });

  /* Disable tilting */
  const interactions = OlInteraction.defaults({altShiftDragRotate: false, pinchRotate: false});

  /* Make view */
  view = new OlView({
    projection: imProjection,
    center: OlExtent.getCenter(imExtent),
    zoom: 3.4,
    minZoom: 2,
    maxZoom: 5.5,
    extent: [300, 300, 5000, 3000]
  });

  /* Generate map */
  map = new OlMap({
    interactions: interactions,
    layers: [
      imlayer,
      vectorLayer
    ],
    target: _config.map_id,
    view: view,
    controls: []
  });

  /* Handle click */
  map.on('click', (evt: any) => {
    /* Create extent of acceptable click */
    const pixel = evt.pixel;
    const pixelOffSet = 30;
    const pixelWithOffsetMin: [number, number] = [pixel[0] - pixelOffSet, pixel[1] + pixelOffSet];
    const pixelWithOffsetMax: [number, number] = [pixel[0] + pixelOffSet, pixel[1] - pixelOffSet];
    const XYMin = map.getCoordinateFromPixel(pixelWithOffsetMin);
    const XYMax = map.getCoordinateFromPixel(pixelWithOffsetMax);
    const ext = XYMax.concat(XYMin);
    const extentFeat = new OlFeature(new OlGeomPolygon([[
      [ext[0], ext[1]],
      [ext[0], ext[3]],
      [ext[2], ext[3]],
      [ext[2], ext[1]],
      [ext[0], ext[1]]
    ]]));

    /* Get first nearby feature */
    const feature = vectorLayer.getSource().forEachFeatureIntersectingExtent(
      extentFeat.getGeometry().getExtent(), (f: any) => f
    );

    /* Zoom in */
    if (feature) {
      const location: ILocation = feature.get('loc')
      moveToLocation(location);
      locationSelectCallback(location);
    } else {
      moveMarker(-50, -50, false);
      locationSelectCallback();
    }
  });

  /* Change mouse cursor on features */
  map.on('pointermove', (e: any) => {
    const pixel = map.getEventPixel(e.originalEvent);
    const hit = map.hasFeatureAtPixel(pixel);
    const nativeElem = document.getElementById(_config.map_id);
    if (nativeElem != null) {
      nativeElem.style.cursor = hit ? 'pointer' : 'move';
    }
  });

  /* Stop following the user on drag */
  map.on('pointerdrag', () => {
    followingUser = false;
  });

  return map;
}

/** Move marker to a location */
export function moveToLocation(loc: ILocation) {
  moveMarker(loc.pixel_x, loc.pixel_y, true);
}

/** Move the marker to location */
export function moveMarker(x: number, y: number, center = true, markerid = _config.marker_id) {
  const pos: [number, number] = [Number(x), 3575 - Number(y)];
  const element: any = document.getElementById(markerid);
  const marker = new OlOverlay({
    position: pos,
    positioning: 'bottom-center',
    element: element,
    stopEvent: false,
    offset: [0, 0]
  });
  map.addOverlay(marker);

  /* Animate */
  if (center) {
    view.animate({center: pos});
    view.animate({zoom: 4.5});
  }
}

/** Show/hide residence buildings on map */
export function setResidencesVisible(visible: boolean) {
  showResidences = visible;
  vectorLayer.getSource().changed();
}

/** Load the high resolution map */
function loadHighRes(): void {
  /* High res source */
  const highResSource = new OlSourceImageStatic({
    url: _config.mapPath,
    attributions: attributions,
    projection: imProjection,
    imageExtent: imExtent,
  });

  /* Load high resolution image */
  const highRes = new Image();
  highRes.src = _config.mapPath;
  highRes.onload = () => {
    imlayer.setSource(highResSource);
  };
}

/** Determine if we support geolocation */
export function hasGeolocation(): boolean {
  return navigator.geolocation ? true : false;
}

/** Setup a location watch */
export function getGPS(failedCallback?: () => void): void {
  if (hasGeolocation()) {
    /* Start following the user */
    followingUser = true;

    /* If we already have permission */
    if (geoLocationId != null) {
      moveGPS(true);
      return;
    }

    /* Get permission and setup a watch */
    geoLocationId = navigator.geolocation.watchPosition((position: Position) => {
      const follow = followingUser || geoLocationLast == null;
      const l = getMapXY(position);
      if (l.pixel_x > 0 && l.pixel_y > 0 && l.pixel_x < 5430 && l.pixel_y < 5375) {
        geoLocationLast = l;
        moveGPS(follow);
      }
    }, () => {}, {
      enableHighAccuracy: true
    });
  } else {
    if (failedCallback) {
      failedCallback();
    }
  }
}

/** Center the user marker to last known location */
function moveGPS(center: boolean) {
  if (geoLocationLast == null) { return; }
  moveMarker(
    geoLocationLast.pixel_x,
    geoLocationLast.pixel_y,
    center,
    _config.user_marker_id
  );
}

/** Apply regression to get pixel coordinates on InstiMap */
export function getMapXY(position: Position): { pixel_x: number, pixel_y: number } {
  /* Set the origin */
  const x = (position.coords.latitude - MAP_Xn) * 1000;
  const y = (position.coords.longitude - MAP_Yn) * 1000;

  /* Apply the model */
  let A = MAP_WEIGHTS_X;
  const px = Math.round(
    MAP_Zn + A[0] + A[1] * x + A[2] * y +
    A[3] * x * x + A[4] * x * x * y +
    A[5] * x * x * y * y + A[6] * y * y +
    A[7] * x * y * y + A[8] * x * y);

  A = MAP_WEIGHTS_Y;
  const py = Math.round(
    MAP_Zyn + A[0] + A[1] * x + A[2] * y +
    A[3] * x * x + A[4] * x * x * y +
    A[5] * x * x * y * y + A[6] * y * y +
    A[7] * x * y * y + A[8] * x * y);

 return {pixel_x : px, pixel_y: py};
}
