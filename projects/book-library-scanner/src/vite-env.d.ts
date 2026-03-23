/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_BOOKS_API_KEY: string;
  readonly VITE_LANGFUSE_PUBLIC_KEY: string;
  readonly VITE_LANGFUSE_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
