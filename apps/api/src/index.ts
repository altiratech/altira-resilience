import { createApp, resolveStore, type Bindings } from './app';
import { processSourceExtractionQueueMessage } from './source-extraction-queue';

const app = createApp();

export default {
  fetch(request: Request, env: Bindings, executionCtx: ExecutionContext) {
    return app.fetch(request, env, executionCtx);
  },
  async queue(batch: MessageBatch<import('./source-extraction-queue').SourceExtractionQueueMessage>, env: Bindings) {
    const store = resolveStore(env);

    for (const message of batch.messages) {
      await processSourceExtractionQueueMessage({
        store,
        ai: env.AI,
        bucket: env.SOURCE_DOCUMENTS_BUCKET,
        message: message.body,
      });
    }
  },
};
