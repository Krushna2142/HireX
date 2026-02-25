/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'google-search-results-nodejs' {
  export class GoogleSearch {
    constructor(apiKey: string);
    json(params: Record<string, any>, callback: (data: any) => void): void;
  }
  const SerpApi: { GoogleSearch: typeof GoogleSearch };
  export default SerpApi;
}
