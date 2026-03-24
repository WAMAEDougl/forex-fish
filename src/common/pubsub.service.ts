import { Injectable } from '@nestjs/common';

@Injectable()
export class PubSub {
  private triggers: Map<string, Set<(data: any) => void>> = new Map();

  publish(triggerName: string, payload: any): boolean {
    const callbacks = this.triggers.get(triggerName);
    if (!callbacks) return false;
    
    callbacks.forEach(callback => callback(payload));
    return true;
  }

  asyncIterator(triggerName: string): AsyncIterator<any> {
    const callbacks = new Set<(data: any) => void>();
    this.triggers.set(triggerName, callbacks);
    
    return {
      next: () => {
        return new Promise<{ done: boolean; value: any }>((resolve) => {
          const callback = (data: any) => {
            callbacks.delete(callback);
            resolve({ done: false, value: data });
          };
          callbacks.add(callback);
        });
      },
    };
  }
}