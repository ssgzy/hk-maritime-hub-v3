/** Shared geographic constants for Hong Kong maritime views. */

export const HK_RECT = {
  west: 113.8,
  south: 22.15,
  east: 114.5,
  north: 22.58,
};

export const HK_CENTER = {
  lon: 114.17,
  lat: 22.3,
  height: 45000,
};

export const CAMERA_PRESETS = {
  all: {
    label: "全港水域",
    destination: { lon: 114.17, lat: 22.28, height: 52000 },
    heading: 0,
    pitch: -45,
  },
  harbour: {
    label: "维多利亚港",
    destination: { lon: 114.17, lat: 22.29, height: 12000 },
    heading: 70,
    pitch: -40,
  },
  west: {
    label: "西部水道",
    destination: { lon: 113.95, lat: 22.32, height: 22000 },
    heading: 20,
    pitch: -42,
  },
  east: {
    label: "东博寮·蓝塘",
    destination: { lon: 114.28, lat: 22.22, height: 28000 },
    heading: -20,
    pitch: -42,
  },
} as const;

export type CameraPresetId = keyof typeof CAMERA_PRESETS;

export const LANDSD_BASEMAP =
  "https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/WGS84/{z}/{x}/{y}.png";
export const LANDSD_LABEL_SC =
  "https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/sc/WGS84/{z}/{x}/{y}.png";
export const HK_DTM =
  "https://tiles.arcgis.com/tiles/6j1KwZfY2fZrfNMR/arcgis/rest/services/HK_DTM/ImageServer";

export function landsd3dUrl(kind: "building" | "infrastructure" | "photomesh", key: string): string {
  if (kind === "photomesh") {
    return `https://data.map.gov.hk/api/3d-data/3dtiles/f2/tileset.json?key=${key}`;
  }
  return `https://data.map.gov.hk/api/3d-data/3dsd/WGS84/${kind}/tileset.json?key=${key}`;
}
