/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_SUPPORT_PHONE?: string;
  /** "office": run as the Office Portal (port 3004) instead of the COE panel. */
  readonly VITE_PANEL?: string;
  readonly VITE_OFFICE_URL?: string;
  readonly VITE_COE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "xlsx";

