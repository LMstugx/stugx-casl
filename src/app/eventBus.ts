type Handler<Payload> = (payload: Payload) => void;

export class EventBus<Events extends object> {
  private readonly handlers = new Map<keyof Events, Set<Handler<Events[keyof Events]>>>();

  on<K extends keyof Events>(type: K, handler: Handler<Events[K]>): () => void {
    const existingHandlers = this.handlers.get(type) ?? new Set<Handler<Events[keyof Events]>>();
    existingHandlers.add(handler as Handler<Events[keyof Events]>);
    this.handlers.set(type, existingHandlers);

    return () => {
      existingHandlers.delete(handler as Handler<Events[keyof Events]>);
      if (existingHandlers.size === 0) {
        this.handlers.delete(type);
      }
    };
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const existingHandlers = this.handlers.get(type);
    if (!existingHandlers) return;

    for (const handler of Array.from(existingHandlers)) {
      handler(payload);
    }
  }

  listenerCount<K extends keyof Events>(type: K): number {
    return this.handlers.get(type)?.size ?? 0;
  }
}
