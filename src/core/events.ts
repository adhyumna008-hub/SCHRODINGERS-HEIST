type EventCallback = (data?: any) => void;

type EventName = 'split' | 'collapse' | 'measured' | 'branchPruned' | 'gateActivated' | 
                 'doorOpened' | 'doorClosed' | 'beaconThrown' | 'beaconTeleport' | 
                 'beaconDestroyed' | 'roomClear' | 'roomStart' | 'checkpoint' | 
                 'coherenceZero' | 'warning' | 'warningCancel';

export class EventBus {
    private listeners: Map<EventName, Set<EventCallback>> = new Map();

    public on(event: EventName, callback: EventCallback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    public off(event: EventName, callback: EventCallback) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.delete(callback);
            if (eventListeners.size === 0) {
                this.listeners.delete(event);
            }
        }
    }

    public emit(event: EventName, data?: any) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            for (const callback of eventListeners) {
                callback(data);
            }
        }
    }
}

export const eventBus = new EventBus();
