
import { debugService } from './debugService';

export class HistoryService<T> {
    private history: T[] = [];
    private pointer: number = -1;
    private subscribers: Set<() => void> = new Set();

    constructor(initialState: T) {
        this.push(initialState);
        debugService.log('HistoryService: Initialized with initial state.');
    }

    public subscribe(callback: () => void): () => void {
        this.subscribers.add(callback);
        return () => {
            this.subscribers.delete(callback);
        };
    }

    private notify(): void {
        this.subscribers.forEach(cb => cb());
    }

    public push(state: T): void {
        debugService.log('HistoryService: Pushing new state', { pointer: this.pointer, historySize: this.history.length });
        // When a new state is pushed, clear any "redo" history
        if (this.pointer < this.history.length - 1) {
            this.history = this.history.slice(0, this.pointer + 1);
        }
        this.history.push(state);
        this.pointer++;
        this.notify();
    }
    
    public undo(): void {
        if (this.canUndo()) {
            this.pointer--;
            debugService.log('HistoryService: Undo', { newPointer: this.pointer });
            this.notify();
        } else {
            debugService.log('HistoryService: Undo failed (no history)');
        }
    }

    public redo(): void {
        if (this.canRedo()) {
            this.pointer++;
            debugService.log('HistoryService: Redo', { newPointer: this.pointer });
            this.notify();
        } else {
            debugService.log('HistoryService: Redo failed (no future state)');
        }
    }

    public current(): T | null {
        return this.history[this.pointer] ?? null;
    }

    public canUndo(): boolean {
        return this.pointer > 0;
    }

    public canRedo(): boolean {
        return this.pointer < this.history.length - 1;
    }
    
    public clearAndPush(state: T): void {
        debugService.log('HistoryService: Clearing history and pushing new initial state');
        this.history = [state];
        this.pointer = 0;
        this.notify();
    }
}
