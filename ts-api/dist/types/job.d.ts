export interface NormalizedJob {
    externalId: string;
    source: string;
    title: string;
    company?: string;
    location?: string;
    description?: string;
    postingUrl?: string;
    postedAt?: Date | null;
    rawPayload: any;
}
