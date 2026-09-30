export class SaveManager {
    private static STARS_KEY_PREFIX = 'sh_stars_';
    private static CHECKPOINT_KEY_PREFIX = 'sh_ckpt_';

    public saveStars(roomId: string, stars: number): void {
        try {
            localStorage.setItem(SaveManager.STARS_KEY_PREFIX + roomId, stars.toString());
        } catch (e) {
            console.warn('Failed to save stars:', e);
        }
    }

    public getStars(roomId: string): number {
        try {
            const val = localStorage.getItem(SaveManager.STARS_KEY_PREFIX + roomId);
            return val ? parseInt(val, 10) : 0;
        } catch (e) {
            console.warn('Failed to get stars:', e);
            return 0;
        }
    }

    public saveCheckpoint(roomId: string, data: any): void {
        try {
            localStorage.setItem(SaveManager.CHECKPOINT_KEY_PREFIX + roomId, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save checkpoint:', e);
        }
    }

    public getCheckpoint(roomId: string): any {
        try {
            const val = localStorage.getItem(SaveManager.CHECKPOINT_KEY_PREFIX + roomId);
            return val ? JSON.parse(val) : null;
        } catch (e) {
            console.warn('Failed to get checkpoint:', e);
            return null;
        }
    }

    public clearAll(): void {
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith(SaveManager.STARS_KEY_PREFIX) || key.startsWith(SaveManager.CHECKPOINT_KEY_PREFIX))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch (e) {
            console.warn('Failed to clear save data:', e);
        }
    }

    public getAllStars(): Record<string, number> {
        const result: Record<string, number> = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(SaveManager.STARS_KEY_PREFIX)) {
                    const roomId = key.substring(SaveManager.STARS_KEY_PREFIX.length);
                    result[roomId] = parseInt(localStorage.getItem(key)!, 10);
                }
            }
        } catch (e) {
            console.warn('Failed to get all stars:', e);
        }
        return result;
    }
}

export const saveManager = new SaveManager();
