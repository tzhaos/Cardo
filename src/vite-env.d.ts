/// <reference types="vite/client" />

declare module '*.sql?raw' {
  const sql: string;
  export default sql;
}

declare const __APP_VERSION__: string;
declare const __APP_LICENSE__: string;
