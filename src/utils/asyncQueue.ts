export { AsyncJobQueue } from "../../common/asyncQueue";
import { AsyncJobQueue } from "../../common/asyncQueue";

const globalAsyncJobQueue = new AsyncJobQueue();

export function enqueue(job: () => Promise<void>): Promise<void> {
  return globalAsyncJobQueue.enqueue(job);
}
