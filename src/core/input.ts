export class InputManager {
    private keys: Map<string, boolean> = new Map();
    private justPressedKeys: Set<string> = new Set();
    private justReleasedKeys: Set<string> = new Set();

    private gameKeys = new Set([
        'w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
        ' ', 'tab', 'e', 'q', 'r', 'm', 'escape', 'backspace', 'enter'
    ]);

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', this.onKeyDown.bind(this));
            window.addEventListener('keyup', this.onKeyUp.bind(this));
        }
    }

    private onKeyDown(e: KeyboardEvent) {
        const key = e.key.toLowerCase();
        if (this.gameKeys.has(key)) {
            e.preventDefault();
        }
        if (!this.keys.get(key)) {
            this.justPressedKeys.add(key);
        }
        this.keys.set(key, true);
    }

    private onKeyUp(e: KeyboardEvent) {
        const key = e.key.toLowerCase();
        if (this.gameKeys.has(key)) {
            e.preventDefault();
        }
        this.keys.set(key, false);
        this.justReleasedKeys.add(key);
    }

    public update() {
        this.justPressedKeys.clear();
        this.justReleasedKeys.clear();
    }

    public isDown(key: string): boolean {
        return !!this.keys.get(key.toLowerCase());
    }

    public wasPressed(key: string): boolean {
        return this.justPressedKeys.has(key.toLowerCase());
    }

    public wasReleased(key: string): boolean {
        return this.justReleasedKeys.has(key.toLowerCase());
    }
}

export const input = new InputManager();
