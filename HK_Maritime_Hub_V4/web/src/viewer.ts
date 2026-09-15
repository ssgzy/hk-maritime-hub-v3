import {
  Viewer,
  UrlTemplateImageryProvider,
  Rectangle,
  Color,
  Cartesian3,
  Math as CesiumMath,
  SceneMode,
  ArcGisMapServerImageryProvider,
  EllipsoidTerrainProvider,
  ImageryLayer,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  Entity,
  Cartesian2,
} from "cesium";
import {
  CAMERA_PRESETS,
  CameraPresetId,
  HK_CENTER,
  HK_DTM,
  HK_RECT,
  LANDSD_BASEMAP,
  LANDSD_LABEL_SC,
} from "./config";

export type MapMode = "2d" | "3d";

export interface ViewerBundle {
  viewer: Viewer;
  basemap: ImageryLayer;
  labels: ImageryLayer;
  setMode: (mode: MapMode) => void;
  getMode: () => MapMode;
  flyToPreset: (id: CameraPresetId) => void;
  onPick: (cb: (entity: Entity | undefined, cartesian: Cartesian3 | undefined) => void) => void;
  destroy: () => void;
}

/** Create Cesium viewer with LandsD topo basemap (not satellite) + optional DTM. */
export async function createViewer(container: HTMLElement): Promise<ViewerBundle> {
  const rect = Rectangle.fromDegrees(HK_RECT.west, HK_RECT.south, HK_RECT.east, HK_RECT.north);

  const basemapProvider = new UrlTemplateImageryProvider({
    url: LANDSD_BASEMAP,
    rectangle: rect,
    minimumLevel: 10,
    maximumLevel: 20,
    credit: "LandsD Topographic Map",
  });
  const labelProvider = new UrlTemplateImageryProvider({
    url: LANDSD_LABEL_SC,
    rectangle: rect,
    minimumLevel: 10,
    maximumLevel: 20,
    credit: "LandsD Labels",
  });

  const viewer = new Viewer(container, {
    animation: true,
    timeline: true,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: true,
    infoBox: false,
    selectionIndicator: true,
    baseLayer: false,
    terrainProvider: new EllipsoidTerrainProvider(),
    requestRenderMode: true,
    maximumRenderTimeChange: Number.POSITIVE_INFINITY,
    sceneMode: SceneMode.SCENE3D,
    msaaSamples: 2,
  });

  const basemap = viewer.imageryLayers.addImageryProvider(basemapProvider);
  const labels = viewer.imageryLayers.addImageryProvider(labelProvider);
  labels.alpha = 0.95;

  viewer.scene.globe.baseColor = Color.fromCssColorString("#0a1628");
  viewer.scene.globe.enableLighting = false;
  viewer.scene.fog.enabled = false;
  if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true;
  viewer.scene.globe.depthTestAgainstTerrain = false;
  viewer.scene.backgroundColor = Color.fromCssColorString("#061018");

  // Hide credit container clutter slightly
  const credit = viewer.cesiumWidget.creditContainer as HTMLElement;
  if (credit) credit.style.display = "none";

  // Try HK DTM terrain (non-fatal)
  try {
    // Cesium 1.145: ArcGISTiledElevationTerrainProvider
    const terrainMod = await import("cesium");
    if ("ArcGISTiledElevationTerrainProvider" in terrainMod) {
      const provider = await (
        terrainMod as typeof terrainMod & {
          ArcGISTiledElevationTerrainProvider: {
            fromUrl: (url: string) => Promise<unknown>;
          };
        }
      ).ArcGISTiledElevationTerrainProvider.fromUrl(HK_DTM);
      viewer.terrainProvider = provider as typeof viewer.terrainProvider;
    }
  } catch (err) {
    console.warn("HK DTM terrain unavailable, using ellipsoid", err);
  }

  let mode: MapMode = "3d";

  const setMode = (next: MapMode) => {
    mode = next;
    if (next === "2d") {
      viewer.scene.morphTo2D(0.6);
    } else {
      viewer.scene.morphTo3D(0.6);
    }
    viewer.scene.requestRender();
  };

  const flyToPreset = (id: CameraPresetId) => {
    const p = CAMERA_PRESETS[id];
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(p.destination.lon, p.destination.lat, p.destination.height),
      orientation: {
        heading: CesiumMath.toRadians(p.heading),
        pitch: CesiumMath.toRadians(p.pitch),
        roll: 0,
      },
      duration: 1.2,
    });
  };

  // Initial camera
  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(HK_CENTER.lon, HK_CENTER.lat, HK_CENTER.height),
    orientation: {
      heading: 0,
      pitch: CesiumMath.toRadians(-45),
      roll: 0,
    },
  });

  const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
  let pickCb: ((entity: Entity | undefined, cartesian: Cartesian3 | undefined) => void) | null =
    null;

  handler.setInputAction((movement: { position: Cartesian2 }) => {
    const picked = viewer.scene.pick(movement.position);
    const cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
    const entity =
      defined(picked) && picked.id instanceof Entity ? (picked.id as Entity) : undefined;
    pickCb?.(entity, cartesian);
    viewer.scene.requestRender();
  }, ScreenSpaceEventType.LEFT_CLICK);

  // Keep animation/timeline hidden until traffic view needs them
  (viewer.animation.container as HTMLElement).style.visibility = "hidden";
  (viewer.timeline.container as HTMLElement).style.visibility = "hidden";

  return {
    viewer,
    basemap,
    labels,
    setMode,
    getMode: () => mode,
    flyToPreset,
    onPick: (cb) => {
      pickCb = cb;
    },
    destroy: () => {
      handler.destroy();
      viewer.destroy();
    },
  };
}

// silence unused import warning for ArcGis if tree-shaken oddly
void ArcGisMapServerImageryProvider;
