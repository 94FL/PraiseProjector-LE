/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_CLOUD_API_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
