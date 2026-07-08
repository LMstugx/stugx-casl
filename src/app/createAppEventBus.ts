import { EventBus } from "./eventBus";
import { AppEvents } from "./events";

export function createAppEventBus(): EventBus<AppEvents> {
  return new EventBus<AppEvents>();
}
