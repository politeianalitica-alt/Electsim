/**
 * Queue client: enqueue background jobs.
 *
 * Implementaciones:
 *   - Upstash QStash si UPSTASH_QSTASH_TOKEN está configurado
 *   - In-memory FIFO en otro caso (sólo persiste durante el lifetime del
 *     process — útil en local/preview)
 *
 * Para activar Upstash:
 *   1. Crea una cuenta en upstash.com → QStash
 *   2. Setea UPSTASH_QSTASH_TOKEN en Vercel
 *   3. Setea UPSTASH_QSTASH_DESTINATION_URL al endpoint que ejecuta los jobs
 *      (típicamente tu propio dominio de Vercel + ruta)
 *   4. npm i @upstash/qstash
 */

import { getLogger } from "@/lib/observability/logger";

const log = getLogger("queue");

export interface QueueMessage<T = unknown> {
  id:        string;
  topic:     string;
  payload:   T;
  createdAt: string;
  attempts:  number;
}

const memoryQueue: QueueMessage[] = [];

export function isQueueConfigured(): boolean {
  return Boolean(process.env.UPSTASH_QSTASH_TOKEN && process.env.UPSTASH_QSTASH_DESTINATION_URL);
}

export async function publish<T>(topic: string, payload: T): Promise<QueueMessage<T>> {
  const msg: QueueMessage<T> = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    topic,
    payload,
    createdAt: new Date().toISOString(),
    attempts:  0,
  };

  if (!isQueueConfigured()) {
    memoryQueue.push(msg as QueueMessage);
    log.debug("enqueued (memory)", { topic, id: msg.id });
    return msg;
  }

  try {
    const upstashMod = "@upstash/qstash";
    const mod: any = await import(/* webpackIgnore: true */ upstashMod);
    const client = new mod.Client({ token: process.env.UPSTASH_QSTASH_TOKEN! });
    const url = process.env.UPSTASH_QSTASH_DESTINATION_URL!;
    await client.publishJSON({
      url: `${url.replace(/\/+$/, "")}/${topic}`,
      body:   payload,
      retries: 3,
    });
    log.info("enqueued (upstash)", { topic, id: msg.id });
    return msg;
  } catch (err) {
    log.warn("queue publish failed — fallback to memory", { topic, err: (err as Error).message });
    memoryQueue.push(msg as QueueMessage);
    return msg;
  }
}

/** Drena la cola en memoria — útil para tests o para el cron loopback. */
export function drain(topic?: string): QueueMessage[] {
  const out: QueueMessage[] = [];
  for (let i = memoryQueue.length - 1; i >= 0; i--) {
    if (!topic || memoryQueue[i].topic === topic) {
      out.unshift(memoryQueue.splice(i, 1)[0]);
    }
  }
  return out;
}

export function pendingCount(topic?: string): number {
  if (!topic) return memoryQueue.length;
  return memoryQueue.filter(m => m.topic === topic).length;
}
