

interface LogEntry {
    timestamp: string;
    message: string;
    data?: any;
}

class DebugService {
    private logs: LogEntry[] = [];
    private listeners: (() => void)[] = [];

    log(message: string, data?: any) {
        const entry: LogEntry = {
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            message: message,
            // Deep copy data to capture the state at a specific point in time
            data: data ? JSON.parse(JSON.stringify(data)) : undefined 
        };
        
        this.logs.unshift(entry); // Add new logs to the top
        if (this.logs.length > 200) { // Keep log size manageable
            this.logs.pop();
        }
        
        // Also log to console for real-time dev convenience
        console.log(`[DEBUG] ${message}`, data);
        
        this.notifyListeners();
    }

    getLogs(): LogEntry[] {
        return this.logs;
    }

    clearLogs() {
        this.logs = [];
        this.notifyListeners();
    }
    
    subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        for (const listener of this.listeners) {
            listener();
        }
    }
}

export const debugService = new DebugService();