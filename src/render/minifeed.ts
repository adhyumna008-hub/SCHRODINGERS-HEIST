import { LOGICAL_WIDTH, LOGICAL_HEIGHT, TILE_SIZE } from '../core/constants';

export class MiniFeedRenderer {
    private offscreenCanvas: HTMLCanvasElement;
    private offscreenCtx: CanvasRenderingContext2D;
    private width = 112;
    private height = 72;

    constructor() {
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.width;
        this.offscreenCanvas.height = this.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    }

    render(mainSceneCtx: CanvasRenderingContext2D, passiveAvatarPos: { x: number, y: number }, time: number) {
        // Auto-detect if time is in milliseconds or seconds
        const t = time > 1000 ? time / 1000 : time;
        const ctx = this.offscreenCtx;
        
        // 1. Clear the offscreen canvas
        ctx.clearRect(0, 0, this.width, this.height);
        
        // 2. Draw the main scene into it but translated so the passive avatar is centered, at 2x scale
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(2, 2);
        ctx.translate(-passiveAvatarPos.x, -passiveAvatarPos.y);
        ctx.drawImage(mainSceneCtx.canvas, 0, 0);
        ctx.restore();

        // 3. Add CRT overlays (scanlines every 2px, static noise based on time)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let y = 0; y < this.height; y += 2) {
            ctx.fillRect(0, y, this.width, 1);
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        // Seed pseudo-random static based on time to change every frame
        for (let i = 0; i < 50; i++) {
            const rx = Math.random() * this.width;
            const ry = Math.random() * this.height;
            const rw = Math.random() * 10;
            const rh = Math.random() * 2;
            ctx.fillRect(rx, ry, rw, rh);
        }

        // 4. Draw red frame border (2px)
        ctx.strokeStyle = '#FF2A3D';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, this.width - 2, this.height - 2);

        // 5. Draw 'CAM-B LIVE' label top-left in red
        ctx.fillStyle = '#FF2A3D';
        ctx.font = '8px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('DECOY / LIVE', 10, 10);

        // 6. Blinking 'REC' dot top-right (blinks every 0.5s based on time)
        // 0.5s cycle = 2Hz
        const isBlinking = Math.sin(t * Math.PI * 4) > 0;
        if (isBlinking) {
            ctx.beginPath();
            ctx.arc(this.width - 15, 15, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // 7. Draw the offscreen result onto the main scene context
        mainSceneCtx.drawImage(this.offscreenCanvas, 292, 633);
    }
}

export function drawEdgePing(ctx: CanvasRenderingContext2D, passivePos: { x: number, y: number }, nearestConeDistance: number, time: number) {
    const threshold = 3 * TILE_SIZE;
    if (nearestConeDistance >= threshold) return;

    const t = time > 1000 ? time / 1000 : time;

    // Pulse rate = lerp(1, 6, 1 - nearestConeDistance/(3*TILE_SIZE)) Hz
    const lerpFactor = 1 - (nearestConeDistance / threshold);
    const pulseRate = 1 + lerpFactor * 5; // 1 to 6 Hz

    const pulsePhase = t * pulseRate * Math.PI * 2;
    const pulseAlpha = 0.5 + (Math.sin(pulsePhase) * 0.5); // 0 to 1

    // Pulsing red ring around the passive clone
    ctx.save();
    ctx.translate(passivePos.x, passivePos.y);
    const pulseScale = 1 + (1 - pulseAlpha) * 0.5; // grows outward
    ctx.scale(pulseScale, pulseScale);
    ctx.strokeStyle = `rgba(255, 42, 61, ${pulseAlpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, TILE_SIZE * 0.75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Arrow pointing inward on the playfield edge
    const distLeft = passivePos.x;
    const distRight = LOGICAL_WIDTH - passivePos.x;
    const distTop = passivePos.y;
    const distBottom = 624 - passivePos.y;

    const minDist = Math.min(distLeft, distRight, distTop, distBottom);
    let arrowX = passivePos.x;
    let arrowY = passivePos.y;
    let rotation = 0;

    if (minDist === distLeft) {
        arrowX = 20;
        rotation = 0; // point right
    } else if (minDist === distRight) {
        arrowX = LOGICAL_WIDTH - 20;
        rotation = Math.PI; // point left
    } else if (minDist === distTop) {
        arrowY = 20;
        rotation = Math.PI / 2; // point down
    } else {
        arrowY = 604;
        rotation = -Math.PI / 2; // point up
    }

    ctx.save();
    ctx.translate(arrowX, arrowY);
    ctx.rotate(rotation);
    ctx.fillStyle = `rgba(255, 42, 61, ${pulseAlpha})`;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-10, -10);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}
