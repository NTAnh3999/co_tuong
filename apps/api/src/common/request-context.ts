import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  readonly requestId: string;
}

const requestStorage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, callback: () => T): T {
  return requestStorage.run(context, callback);
}

export function getRequestContext(): RequestContext | undefined {
  return requestStorage.getStore();
}

export function getRequestId(): string | undefined {
  return getRequestContext()?.requestId;
}
