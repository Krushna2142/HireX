/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/types/google-search-results-nodejs.d.ts
declare module 'google-search-results-nodejs' {
  export class GoogleSearch {
    constructor(apiKey: string);
    json(params: Record<string, any>, callback: (data: any) => void): void;
  }
  const SerpApi: { GoogleSearch: typeof GoogleSearch };
  export default SerpApi;
}
