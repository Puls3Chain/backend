// Soroban contract emits these topic identifiers for backend ingestion.
export const TIP_EVENT = 'tip';
export const WITHDRAWAL_EVENT = 'withdrawal';
export const REGISTER_EVENT = 'register';

export const CONTRACT_EVENT_TOPICS = [
  TIP_EVENT,
  WITHDRAWAL_EVENT,
  REGISTER_EVENT,
] as const;

export type ContractEventTopic = (typeof CONTRACT_EVENT_TOPICS)[number];

export interface StellarContractEventPayload {
  topic: string | string[];
  transactionHash: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export function normalizeContractEventTopic(
  topic: string | string[],
): string | null {
  if (Array.isArray(topic)) {
    return topic.length > 0 ? topic[topic.length - 1] : null;
  }

  return topic || null;
}
