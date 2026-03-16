/* eslint-disable prettier/prettier */
// src/common/constants/queues.constant.ts
export const QUEUES = {
  RESUME_ANALYSIS: 'resume-analysis',
} as const;

export type QueueName = typeof QUEUES[keyof typeof QUEUES];