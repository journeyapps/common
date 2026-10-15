export interface BaseObserverInterface<T> {
  registerListener(listener: Partial<T>): () => void;
  iterateListeners(cb: (listener: Partial<T>) => any): void;
}

export class BaseObserver<T> implements BaseObserverInterface<T> {
  private static counter = 0;

  private readonly listeners: Map<string, Partial<T>>;

  constructor() {
    this.listeners = new Map();
  }

  private static id() {
    return `${BaseObserver.counter++}`;
  }

  get _listenerSize() {
    return this.listeners.size;
  }

  registerListener(listener: Partial<T>): () => void {
    const id = BaseObserver.id();
    this.listeners.set(id, listener);
    return () => {
      this.listeners.delete(id);
    };
  }

  /**
   * Remove all current listener registrations.
   */
  clearListeners(): void {
    this.listeners.clear();
  }

  iterateListeners(cb: (listener: Partial<T>) => any) {
    for (let i of this.listeners.values()) {
      cb(i);
    }
  }

  async iterateAsyncListeners(cb: (listener: Partial<T>) => Promise<any>) {
    for (let i of this.listeners.values()) {
      await cb(i);
    }
  }
}
