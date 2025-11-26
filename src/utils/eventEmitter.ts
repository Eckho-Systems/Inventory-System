// Simple event emitter for real-time updates
type EventCallback = (...args: any[]) => void;

class EventEmitter {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    const callbacks = this.events.get(event)!;
    callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(...args));
    }
  }

  off(event: string, callback?: EventCallback): void {
    if (!this.events.has(event)) return;
    
    if (!callback) {
      // Remove all listeners for this event
      this.events.delete(event);
      return;
    }
    
    const callbacks = this.events.get(event)!;
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
    
    if (callbacks.length === 0) {
      this.events.delete(event);
    }
  }
}

export const eventEmitter = new EventEmitter();
