import {
  Color,
  GeoJsonDataSource,
  HeightReference,
  HorizontalOrigin,
  LabelStyle,
  VerticalOrigin,
  Viewer,
  ColorMaterialProperty,
  ConstantProperty,
  Entity,
  LabelGraphics,
  PointGraphics,
  BoundingSphere,
} from "cesium";
import { FAIRWAY_NAMES, SRZ_NAMES, classifySrz, isTss, localizeName } from "../i18n/names";

export interface LayerHandle {
  id: string;
  title: string;
  dataSource: GeoJsonDataSource;
  setVisible: (v: boolean) => void;
}

async function loadGeo(viewer: Viewer, url: string, id: string): Promise<GeoJsonDataSource> {
  const ds = await GeoJsonDataSource.load(url, {
    clampToGround: true,
  });
  ds.name = id;
  await viewer.dataSources.add(ds);
  return ds;
}

function stylePolygon(
  entity: Entity,
  fill: Color,
  outline: Color,
  outlineWidth = 2,
): void {
  if (entity.polygon) {
    entity.polygon.material = new ColorMaterialProperty(fill);
    entity.polygon.outline = new ConstantProperty(true);
    entity.polygon.outlineColor = new ConstantProperty(outline);
    entity.polygon.outlineWidth = new ConstantProperty(outlineWidth);
    entity.polygon.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
  }
  if (entity.polyline) {
    entity.polyline.material = new ColorMaterialProperty(outline);
    entity.polyline.width = new ConstantProperty(3);
    entity.polyline.clampToGround = new ConstantProperty(true);
  }
}

export async function loadFairways(viewer: Viewer): Promise<LayerHandle> {
  const ds = await loadGeo(viewer, "/data/geo/fairways.geojson", "fairways");
  for (const entity of ds.entities.values) {
    const props = entity.properties;
    const en = props?.OBJNAM?.getValue?.() ?? props?.OBJNAM;
    const name = String(en || "");
    const zh = localizeName(name, FAIRWAY_NAMES);
    const tss = isTss(name);
    const fill = tss
      ? Color.fromCssColorString("#f4a261").withAlpha(0.35)
      : Color.fromCssColorString("#48a9ff").withAlpha(0.32);
    const outline = tss
      ? Color.fromCssColorString("#e76f51")
      : Color.fromCssColorString("#1d8fff");
    stylePolygon(entity, fill, outline, tss ? 3 : 2);
    entity.name = `${zh} (${name})`;
    entity.description = new ConstantProperty(
      `<div><b>${zh}</b><br/><span style="opacity:.75">${name}</span><br/>${
        props?.INFORM?.getValue?.() ?? props?.INFORM ?? ""
      }</div>`,
    );
    try {
      const hierarchy = entity.polygon?.hierarchy?.getValue?.(viewer.clock.currentTime);
      if (hierarchy?.positions?.length) {
        const sphere = BoundingSphere.fromPoints(hierarchy.positions);
        entity.position = sphere.center as unknown as Entity["position"];
        entity.label = new LabelGraphics({
          text: zh,
          font: "13px Inter, PingFang SC, sans-serif",
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 3,
          style: LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: VerticalOrigin.CENTER,
          horizontalOrigin: HorizontalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          show: true,
        });
      }
    } catch {
      /* ignore */
    }
  }
  viewer.scene.requestRender();
  return {
    id: "fairways",
    title: "航道 / 分道通航制",
    dataSource: ds,
    setVisible: (v) => {
      ds.show = v;
      viewer.scene.requestRender();
    },
  };
}

export async function loadSrz(viewer: Viewer): Promise<LayerHandle> {
  const ds = await loadGeo(viewer, "/data/geo/srz.geojson", "srz");
  for (const entity of ds.entities.values) {
    const props = entity.properties;
    const en = String(props?.OBJNAM?.getValue?.() ?? props?.OBJNAM ?? "");
    const inform = String(props?.INFORM?.getValue?.() ?? props?.INFORM ?? "");
    const zh = localizeName(en, SRZ_NAMES);
    const cls = classifySrz(inform, en);
    stylePolygon(
      entity,
      Color.fromCssColorString(cls.color).withAlpha(0.28),
      Color.fromCssColorString(cls.color),
      1.5,
    );
    entity.name = `${zh} · ${cls.label}`;
    entity.description = new ConstantProperty(
      `<div><b>${zh}</b><br/><span style="color:${cls.color}">${cls.label}</span><br/>${inform}</div>`,
    );
  }
  viewer.scene.requestRender();
  return {
    id: "srz",
    title: "限速区",
    dataSource: ds,
    setVisible: (v) => {
      ds.show = v;
      viewer.scene.requestRender();
    },
  };
}

const AUX_STYLES: Record<
  string,
  { fill: string; outline: string; point?: string; title: string }
> = {
  harbour_limit: {
    fill: "#ffffff00",
    outline: "#ffd166",
    title: "港口界限",
  },
  calling_in: { fill: "#ffd166", outline: "#ffd166", point: "#ffd166", title: "报告点" },
  pilot_boarding: { fill: "#ef476f", outline: "#ef476f", point: "#ef476f", title: "引航站" },
  typhoon_shelter: {
    fill: "#7c5cff55",
    outline: "#7c5cff",
    title: "避风塘",
  },
  hkia_approach: {
    fill: "#ff006e44",
    outline: "#ff006e",
    title: "机场进近限制区",
  },
  bridge_areas: {
    fill: "#8338ec44",
    outline: "#8338ec",
    title: "桥区高度限制",
  },
  private_mooring: {
    fill: "#3a86ff44",
    outline: "#3a86ff",
    title: "私人系泊区",
  },
  marine_park: {
    fill: "#2ec4b644",
    outline: "#2ec4b6",
    title: "海岸公园",
  },
  pcwa_berth: {
    fill: "#fb850044",
    outline: "#fb8500",
    title: "公众货物装卸区",
  },
  bright_light_fishing: {
    fill: "#ffbe0b33",
    outline: "#ffbe0b",
    title: "光诱捕鱼区",
  },
  tide_stations: {
    fill: "#00bbf9",
    outline: "#00bbf9",
    point: "#00bbf9",
    title: "潮汐站",
  },
};

export async function loadAuxLayer(
  viewer: Viewer,
  id: string,
  defaultOn: boolean,
): Promise<LayerHandle | null> {
  const style = AUX_STYLES[id];
  if (!style) return null;
  try {
    const ds = await loadGeo(viewer, `/data/geo/${id}.geojson`, id);
    for (const entity of ds.entities.values) {
      const props = entity.properties;
      const name =
        props?.OBJNAM?.getValue?.() ??
        props?.OBJANM?.getValue?.() ??
        props?.name_sc?.getValue?.() ??
        props?.NAME_SC?.getValue?.() ??
        props?.NAME_TC?.getValue?.() ??
        props?.name_tc?.getValue?.() ??
        props?.NAME_EN?.getValue?.() ??
        props?.TIDE_STATION_SC?.getValue?.() ??
        style.title;
      stylePolygon(
        entity,
        Color.fromCssColorString(style.fill.length === 7 ? style.fill + "55" : style.fill),
        Color.fromCssColorString(style.outline),
      );
      if (entity.billboard || (!entity.polygon && !entity.polyline)) {
        entity.point = new PointGraphics({
          pixelSize: 10,
          color: Color.fromCssColorString(style.point || style.outline),
          outlineColor: Color.BLACK,
          outlineWidth: 1,
          heightReference: HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        });
      }
      if (entity.polyline) {
        entity.polyline.material = new ColorMaterialProperty(
          Color.fromCssColorString(style.outline),
        );
        entity.polyline.width = new ConstantProperty(2);
      }
      entity.name = String(name);
      const inform = props?.INFORM?.getValue?.() ?? props?.INFORM ?? "";
      const vhf = props?.VHFCHANNEL?.getValue?.() ?? props?.VHFCHANNEL;
      const traffic = props?.TRAFFIC?.getValue?.() ?? props?.TRAFFIC;
      entity.description = new ConstantProperty(
        `<div><b>${name}</b>${vhf ? `<br/>VHF ${vhf}` : ""}${
          traffic ? `<br/>${traffic}` : ""
        }<br/>${inform}</div>`,
      );
    }
    ds.show = defaultOn;
    viewer.scene.requestRender();
    return {
      id,
      title: style.title,
      dataSource: ds,
      setVisible: (v) => {
        ds.show = v;
        viewer.scene.requestRender();
      },
    };
  } catch (err) {
    console.warn(`Failed to load aux layer ${id}`, err);
    return null;
  }
}

export const AUX_LAYER_IDS = Object.keys(AUX_STYLES);
