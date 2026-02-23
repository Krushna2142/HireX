/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import SerpApi from 'google-search-results-nodejs';

@Injectable()
export class JobsService {
  private search;

  constructor(private config: ConfigService) { 
    this.search = new SerpApi.GoogleSearch(
  this.config.getOrThrow<string>('serpApiKey')
);
  }

  async fetchJobs(query: string, location = 'India') {
    const params = {
      engine: 'google_jobs',
      q: query,
      location,
      hl: 'en',
      api_key: this.config.get('serpApiKey'),
    };

    return new Promise((resolve, reject) => {
      this.search.json(params, (data) => {
        if (!data) return reject('No data');
        resolve(data);
      });
    });
  }
}