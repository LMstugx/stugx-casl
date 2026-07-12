export interface BuildMetadata {
  version: string;
  commit: string;
  buildMode: "production" | "development";
  wasmBackend: boolean;
  basePath: string;
}

export const BUILD_METADATA: Readonly<BuildMetadata> = Object.freeze({ ...__STUGX_BUILD_METADATA__ });
