import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ConnectionOptions, Job, JobsOptions, Queue, Worker } from "bullmq";
import { QUEUES, QueueName } from "./queue-names";

type Processor<T = unknown> = (job: Job<T>) => Promise<unknown>;

@Injectable()
export class BullmqService implements OnModuleDestroy {
  private readonly connection?: ConnectionOptions;
  private readonly queues = new Map<string, Queue>();
  private readonly workers: Worker[] = [];

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>("REDIS_URL");
    if (redisUrl) {
      this.connection = { url: redisUrl };
    }
  }

  get enabled() {
    return Boolean(this.connection);
  }

  queue(name: QueueName) {
    if (!this.connection) return undefined;
    const existing = this.queues.get(name);
    if (existing) return existing;
    const queue = new Queue(name, { connection: this.connection });
    this.queues.set(name, queue);
    return queue;
  }

  async add<T>(queueName: QueueName, name: string, data: T, options: JobsOptions = {}) {
    const queue = this.queue(queueName);
    if (!queue) return undefined;
    return queue.add(name, data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 500,
      removeOnFail: 1_000,
      ...options
    });
  }

  registerWorker<T>(queueName: QueueName, processor: Processor<T>) {
    if (!this.connection || this.config.get<string>("ENABLE_WORKERS") !== "true") return undefined;
    const worker = new Worker(queueName, processor as Processor, { connection: this.connection, concurrency: 5 });
    this.workers.push(worker);
    return worker;
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all(Array.from(this.queues.values()).map((queue) => queue.close()));
  }
}

export { QUEUES };
