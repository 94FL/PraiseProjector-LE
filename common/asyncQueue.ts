export class AsyncJobQueue {
  private readonly queue: Array<{ original: () => Promise<void>; runner: () => Promise<void> }> = [];
  private draining = false;
  private activeJob: (() => Promise<void>) | null = null;

  enqueue(job: () => Promise<void>) {
    return new Promise<void>((resolve, reject) => {
      const entry = {
        original: job,
        runner: async () => {
          try {
            await job();
            resolve();
          } catch (error) {
            reject(error);
          }
        },
      };

      this.queue.push(entry);
      this.scheduleDrain();
    });
  }

  includes(job: () => Promise<void>) {
    return this.activeJob === job || this.queue.some((entry) => entry.original === job);
  }

  private scheduleDrain() {
    if (this.draining) return;
    this.draining = true;
    void this.drainQueue();
  }

  private async drainQueue() {
    try {
      while (this.queue.length > 0) {
        const entry = this.queue.shift();
        if (!entry) continue;
        this.activeJob = entry.original;
        try {
          await entry.runner();
        } finally {
          this.activeJob = null;
        }
      }
    } finally {
      this.draining = false;
    }
  }
}
