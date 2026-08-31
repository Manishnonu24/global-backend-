import { EventEmitter } from "events";

class ApplicationEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }
}

const globalForEventBus = globalThis;

export const EventBus =
  globalForEventBus.eventBus || new ApplicationEventBus();

if (process.env.NODE_ENV !== "production") {
  globalForEventBus.eventBus = EventBus;
}


