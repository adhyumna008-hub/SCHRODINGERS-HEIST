import { FIXED_DT } from './constants';

export class GameLoop {
    private lastTime: number = 0;
    private accumulator: number = 0;
    private rafId: number | null = null;
    
    public isRunning: boolean = false;
    public frameCount: number = 0;
    public elapsedTime: number = 0;

    constructor(
        private updateCallback: (dt: number) => void,
        private renderCallback: (alpha: number) => void
    ) {}

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.rafId = requestAnimationFrame(this.loop.bind(this));
    }

    public stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    private loop(time: number) {
        if (!this.isRunning) return;

        let frameTime = (time - this.lastTime) / 1000;
        this.lastTime = time;

        // Cap frame time to prevent spiral of death (max 5 frames worth)
        if (frameTime > FIXED_DT * 5) {
            frameTime = FIXED_DT * 5;
        }

        this.accumulator += frameTime;

        while (this.accumulator >= FIXED_DT) {
            this.updateCallback(FIXED_DT);
            this.accumulator -= FIXED_DT;
            this.elapsedTime += FIXED_DT;
            this.frameCount++;
        }

        const alpha = this.accumulator / FIXED_DT;
        this.renderCallback(alpha);

        this.rafId = requestAnimationFrame(this.loop.bind(this));
    }
}
