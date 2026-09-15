import {
  Viewer,
  JulianDate,
  ClockRange,
  SampledPositionProperty,
  Cartesian3,
  Color,
  VelocityOrientationProperty,
  TimeInterval,
  TimeIntervalCollection,
  Entity,
  SingleTileImageryProvider,
  ImageryLayer,
  Rectangle,
  CallbackProperty,
  Math as CesiumMath,
} from "cesium";
import { HK_RECT } from "../config";

export interface TrafficStats {
  generated_at?: string;
  window_start?: string | null;
  window_end?: string | null;
  unique_24h?: number;
  unique_7d?: number;
  by_type_24h?: Record<string, number>;
  fairway_top?: { name: string; vessels: number }[];
  hourly_24h?: number[];
  moving_tracks?: number;
  moored?: number;
  srz_speeding_ratio?: number | null;
  srz_samples?: number;
  srz_note?: string;
  density?: Record<string, { path: string; bbox?: number[] }>;
  note?: string;
}

export interface TracksPayload {
  generated_at?: string;
  window_start?: string | null;
  window_end?: string | null;
  vessel_count?: number;
  moored_count?: number;
  tracks: Array<{
    mmsi: number;
    name?: string | null;
    category: string;
    ship_type?: number | null;
    length_m?: number | null;
    points: Array<{ t: number; lon: number; lat: number; sog?: number | null; cog?: number | null }>;
  }>;
  moored: Array<{
    mmsi: number;
    name?: string | null;
    category: string;
    lon: number;
    lat: number;
  }>;
  note?: string;
}

const CAT_COLOR: Record<string, Color> = {
  cargo_tanker: Color.fromCssColorString("#ff9f1c"),
  passenger: Color.fromCssColorString("#06d6a0"),
  hsc: Color.fromCssColorString("#48a9ff"),
  other: Color.fromCssColorString("#cdb4db"),
};

export interface TrafficHandle {
  loaded: boolean;
  stats: TrafficStats | null;
  tracks: TracksPayload | null;
  setReplayVisible: (v: boolean) => void;
  setDensity: (key: "all" | "cargo_tanker" | "passenger" | "other" | "off") => Promise<void>;
  setSpeedMultiplier: (m: number) => void;
  clear: () => void;
}

export async function loadTraffic(viewer: Viewer): Promise<TrafficHandle> {
  const [tracksRes, statsRes] = await Promise.all([
    fetch("/data/traffic/tracks_24h.json"),
    fetch("/data/traffic/stats.json"),
  ]);
  const tracks: TracksPayload = tracksRes.ok
    ? await tracksRes.json()
    : { tracks: [], moored: [], note: "无航迹数据" };
  const stats: TrafficStats = statsRes.ok
    ? await statsRes.json()
    : { note: "无统计数据" };

  const entities: Entity[] = [];
  let densityLayer: ImageryLayer | null = null;
  let replayVisible = true;

  // Clock setup from track window
  const times = tracks.tracks.flatMap((t) => t.points.map((p) => p.t));
  if (times.length >= 2) {
    const start = JulianDate.fromDate(new Date(Math.min(...times) * 1000));
    const stop = JulianDate.fromDate(new Date(Math.max(...times) * 1000));
    viewer.clock.startTime = start.clone();
    viewer.clock.stopTime = stop.clone();
    viewer.clock.currentTime = start.clone();
    viewer.clock.clockRange = ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 120;
    viewer.clock.shouldAnimate = true;
    viewer.timeline?.zoomTo(start, stop);
    (viewer.animation.container as HTMLElement).style.visibility = "visible";
    (viewer.timeline.container as HTMLElement).style.visibility = "visible";
  }

  for (const track of tracks.tracks) {
    if (!track.points?.length) continue;
    const position = new SampledPositionProperty();
    for (const p of track.points) {
      position.addSample(
        JulianDate.fromDate(new Date(p.t * 1000)),
        Cartesian3.fromDegrees(p.lon, p.lat, 15),
      );
    }
    const start = JulianDate.fromDate(new Date(track.points[0].t * 1000));
    const stop = JulianDate.fromDate(new Date(track.points[track.points.length - 1].t * 1000));
    const color = CAT_COLOR[track.category] || CAT_COLOR.other;
    const entity = viewer.entities.add({
      id: `ais-${track.mmsi}`,
      name: track.name || `MMSI ${track.mmsi}`,
      availability: new TimeIntervalCollection([
        new TimeInterval({ start, stop }),
      ]),
      position,
      orientation: new VelocityOrientationProperty(position),
      point: {
        pixelSize: 9,
        color,
        outlineColor: Color.BLACK,
        outlineWidth: 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      path: {
        leadTime: 0,
        trailTime: 1800,
        width: 2,
        material: color.withAlpha(0.65),
      },
      description: `<div><b>${track.name || "未知船名"}</b><br/>MMSI ${track.mmsi}<br/>类型 ${
        track.category
      }${track.length_m ? `<br/>船长约 ${Math.round(track.length_m)} m` : ""}</div>`,
    });
    entities.push(entity);
  }

  for (const m of tracks.moored || []) {
    const color = (CAT_COLOR[m.category] || CAT_COLOR.other).withAlpha(0.55);
    const entity = viewer.entities.add({
      id: `moored-${m.mmsi}`,
      name: m.name || `停泊 ${m.mmsi}`,
      position: Cartesian3.fromDegrees(m.lon, m.lat, 5),
      point: {
        pixelSize: 5,
        color,
        outlineColor: Color.BLACK,
        outlineWidth: 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    entities.push(entity);
  }

  viewer.scene.requestRender();

  const handle: TrafficHandle = {
    loaded: true,
    stats,
    tracks,
    setReplayVisible(v) {
      replayVisible = v;
      for (const e of entities) e.show = v;
      viewer.clock.shouldAnimate = v;
      (viewer.animation.container as HTMLElement).style.visibility = v ? "visible" : "hidden";
      (viewer.timeline.container as HTMLElement).style.visibility = v ? "visible" : "hidden";
      viewer.scene.requestRender();
    },
    async setDensity(key) {
      if (densityLayer) {
        viewer.imageryLayers.remove(densityLayer, true);
        densityLayer = null;
      }
      if (key === "off") {
        viewer.scene.requestRender();
        return;
      }
      const meta = stats.density?.[key];
      const path = meta?.path ? `/data/${meta.path}` : `/data/traffic/density_7d_${key}.png`;
      const bbox = meta?.bbox || [HK_RECT.west, HK_RECT.south, HK_RECT.east, HK_RECT.north];
      try {
        const provider = await SingleTileImageryProvider.fromUrl(path, {
          rectangle: Rectangle.fromDegrees(bbox[0], bbox[1], bbox[2], bbox[3]),
        });
        densityLayer = viewer.imageryLayers.addImageryProvider(provider);
        densityLayer.alpha = 0.72;
      } catch (err) {
        console.warn("density overlay failed", err);
      }
      viewer.scene.requestRender();
    },
    setSpeedMultiplier(m) {
      viewer.clock.multiplier = m;
    },
    clear() {
      for (const e of entities) viewer.entities.remove(e);
      entities.length = 0;
      if (densityLayer) {
        viewer.imageryLayers.remove(densityLayer, true);
        densityLayer = null;
      }
      viewer.clock.shouldAnimate = false;
      (viewer.animation.container as HTMLElement).style.visibility = "hidden";
      (viewer.timeline.container as HTMLElement).style.visibility = "hidden";
      viewer.scene.requestRender();
    },
  };

  void replayVisible;
  void CallbackProperty;
  void CesiumMath;
  return handle;
}
