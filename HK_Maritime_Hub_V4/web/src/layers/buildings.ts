import {
  Cesium3DTileset,
  Viewer,
} from "cesium";
import { landsd3dUrl } from "../config";

export interface BuildingsHandle {
  building: Cesium3DTileset | null;
  infrastructure: Cesium3DTileset | null;
  photomesh: Cesium3DTileset | null;
  setBuilding: (v: boolean) => Promise<void>;
  setInfrastructure: (v: boolean) => Promise<void>;
  setPhotomesh: (v: boolean) => Promise<void>;
}

async function loadTileset(viewer: Viewer, url: string, sse: number): Promise<Cesium3DTileset> {
  const tileset = await Cesium3DTileset.fromUrl(url, {
    maximumScreenSpaceError: sse,
  });
  viewer.scene.primitives.add(tileset);
  viewer.scene.requestRender();
  return tileset;
}

export function createBuildingsController(viewer: Viewer): BuildingsHandle {
  const key = import.meta.env.VITE_LANDSD_3D_KEY || "3967f8f365694e0798af3e7678509421";
  const handle: BuildingsHandle = {
    building: null,
    infrastructure: null,
    photomesh: null,
    async setBuilding(v) {
      if (v) {
        if (!handle.building) {
          handle.building = await loadTileset(viewer, landsd3dUrl("building", key), 24);
        }
        handle.building.show = true;
      } else if (handle.building) {
        handle.building.show = false;
      }
      viewer.scene.requestRender();
    },
    async setInfrastructure(v) {
      if (v) {
        if (!handle.infrastructure) {
          handle.infrastructure = await loadTileset(
            viewer,
            landsd3dUrl("infrastructure", key),
            28,
          );
        }
        handle.infrastructure.show = true;
      } else if (handle.infrastructure) {
        handle.infrastructure.show = false;
      }
      viewer.scene.requestRender();
    },
    async setPhotomesh(v) {
      if (v) {
        if (!handle.photomesh) {
          handle.photomesh = await loadTileset(viewer, landsd3dUrl("photomesh", key), 32);
        }
        handle.photomesh.show = true;
      } else if (handle.photomesh) {
        handle.photomesh.show = false;
      }
      viewer.scene.requestRender();
    },
  };
  return handle;
}
