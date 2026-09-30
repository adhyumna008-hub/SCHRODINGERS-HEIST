import {
    setGlow,
    clearGlow,
    drawGlowLine,
    drawGlowRect,
    drawGlowCircle,
    drawGlowPolygon,
    drawDashedGlowCircle,
    drawGlowText
} from './glow';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, TILE_SIZE, BG_COLOR } from '../core/constants';

export interface Wall {
    x: number;
    y: number;
    w: number;
    h: number;
}

export class Renderer {
    private sceneCanvas: HTMLCanvasElement;
    private sceneCtx: CanvasRenderingContext2D;

    constructor(mainCanvas: HTMLCanvasElement) {
        this.sceneCanvas = document.createElement('canvas');
        this.sceneCanvas.width = LOGICAL_WIDTH;
        this.sceneCanvas.height = LOGICAL_HEIGHT;
        this.sceneCtx = this.sceneCanvas.getContext('2d') as CanvasRenderingContext2D;
    }

    public getSceneCanvas(): HTMLCanvasElement {
        return this.sceneCanvas;
    }

    public getSceneCtx(): CanvasRenderingContext2D {
        return this.sceneCtx;
    }

    public clear(): void {
        this.sceneCtx.clearRect(0, 0, this.sceneCanvas.width, this.sceneCanvas.height);
    }

    public drawBackground(): void {
        this.sceneCtx.fillStyle = BG_COLOR;
        this.sceneCtx.fillRect(0, 0, this.sceneCanvas.width, this.sceneCanvas.height);

        this.sceneCtx.strokeStyle = '#FFFFFF';
        this.sceneCtx.globalAlpha = 0.03;
        this.sceneCtx.lineWidth = 1;
        
        this.sceneCtx.beginPath();
        for (let x = 0; x <= this.sceneCanvas.width; x += TILE_SIZE) {
            this.sceneCtx.moveTo(x, 0);
            this.sceneCtx.lineTo(x, this.sceneCanvas.height);
        }
        for (let y = 0; y <= this.sceneCanvas.height; y += TILE_SIZE) {
            this.sceneCtx.moveTo(0, y);
            this.sceneCtx.lineTo(this.sceneCanvas.width, y);
        }
        this.sceneCtx.stroke();
        this.sceneCtx.globalAlpha = 1.0;
    }

    public drawWalls(walls: Wall[]): void {
        // Simplified rendering for walls: draw individual wall rects.
        for (const wall of walls) {
            const px = wall.x * TILE_SIZE;
            const py = wall.y * TILE_SIZE;
            const pw = wall.w * TILE_SIZE;
            const ph = wall.h * TILE_SIZE;
            
            drawGlowRect(this.sceneCtx, px, py, pw, ph, '#0A2040', 2);
            // Fill wall body slightly darker
            this.sceneCtx.fillStyle = '#05070B';
            this.sceneCtx.fillRect(px, py, pw, ph);
        }
    }

    public drawAvatar(x: number, y: number, isActive: boolean, isControlled: boolean, color: string): void {
        const radius = TILE_SIZE / 2 * 0.8;
        if (isActive) {
            drawGlowCircle(this.sceneCtx, x, y, radius, color, 3);
            if (isControlled) {
                this.sceneCtx.fillStyle = '#F2F6FA';
                this.sceneCtx.beginPath();
                this.sceneCtx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
                this.sceneCtx.fill();
            }
            this.sceneCtx.fillStyle = '#FFFFFF';
            this.sceneCtx.font = '10px Orbitron';
            this.sceneCtx.textAlign = 'center';
            this.sceneCtx.fillText('A ACTIVE', x, y - radius - 10);
        } else {
            const time = Date.now() / 1000;
            drawDashedGlowCircle(this.sceneCtx, x, y, radius, color, 8, time * Math.PI);
            this.sceneCtx.fillStyle = color;
            this.sceneCtx.globalAlpha = 0.6;
            this.sceneCtx.font = '10px Orbitron';
            this.sceneCtx.textAlign = 'center';
            this.sceneCtx.fillText('B passive clone', x, y - radius - 10);
            this.sceneCtx.globalAlpha = 1.0;
        }
    }

    public drawCameraCone(points: {x: number, y: number}[], alertLevel: number): void {
        if (points.length < 3) return;
        this.sceneCtx.beginPath();
        this.sceneCtx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.sceneCtx.lineTo(points[i].x, points[i].y);
        }
        this.sceneCtx.closePath();

        const color = `rgba(255, 0, 0, ${0.15 + alertLevel * 0.05})`;
        this.sceneCtx.fillStyle = color;
        this.sceneCtx.fill();

        this.sceneCtx.strokeStyle = '#FF0000';
        this.sceneCtx.lineWidth = 1;
        this.sceneCtx.globalAlpha = 0.5;
        this.sceneCtx.stroke();
        this.sceneCtx.globalAlpha = 1.0;
    }

    public drawCameraBody(x: number, y: number, angle: number): void {
        this.sceneCtx.save();
        this.sceneCtx.translate(x, y);
        this.sceneCtx.rotate(angle);
        
        drawGlowRect(this.sceneCtx, -10, -10, 20, 20, '#555555', 2);
        
        this.sceneCtx.fillStyle = '#FF0000';
        setGlow(this.sceneCtx, '#FF0000', 8);
        this.sceneCtx.beginPath();
        this.sceneCtx.arc(0, 0, 4, 0, Math.PI * 2);
        this.sceneCtx.fill();
        clearGlow(this.sceneCtx);
        
        this.sceneCtx.restore();
    }

    public drawLaser(x1: number, y1: number, x2: number, y2: number, active: boolean): void {
        if (!active) return;
        const flicker = Math.random() > 0.1 ? 1 : 0.5;
        drawGlowLine(this.sceneCtx, x1, y1, x2, y2, '#FF0000', 2, 6, flicker);
    }

    public drawDoor(x: number, y: number, w: number, h: number, state: 'closed' | 'open' | 'superposed', color: string): void {
        if (state === 'open') return;
        
        if (state === 'closed') {
            drawGlowRect(this.sceneCtx, x, y, w, h, color, 3);
        } else if (state === 'superposed') {
            const time = Date.now() / 200;
            this.sceneCtx.save();
            this.sceneCtx.setLineDash([5, 5]);
            this.sceneCtx.lineDashOffset = time % 10;
            drawGlowRect(this.sceneCtx, x, y, w, h, color, 2);
            this.sceneCtx.restore();
        }
    }

    public drawPanel(x: number, y: number, gateType: 'X' | 'H' | 'switch' | 'plate', active: boolean, color: string): void {
        const drawColor = active ? color : '#555555';
        drawGlowRect(this.sceneCtx, x - 15, y - 15, 30, 30, drawColor, 2);
        
        let label = '';
        if (gateType === 'X') label = 'X';
        else if (gateType === 'H') label = 'H';
        else if (gateType === 'switch') label = 'S';
        else if (gateType === 'plate') label = 'P';
        
        drawGlowText(this.sceneCtx, label, x, y, drawColor, '14px Orbitron', 'center');
    }

    public drawBeacon(x: number, y: number): void {
        const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
        const r = 4 + pulse * 4;
        const color = pulse > 0.5 ? '#FF00FF' : '#00FFFF';
        drawGlowCircle(this.sceneCtx, x, y, r, color, 2);
    }

    public drawBeaconLink(fromX: number, fromY: number, toX: number, toY: number, pulse: number): void {
        this.sceneCtx.save();
        this.sceneCtx.setLineDash([10, 10]);
        this.sceneCtx.lineDashOffset = -pulse * 20;
        drawGlowLine(this.sceneCtx, fromX, fromY, toX, toY, '#FF00FF', 2, 6, 0.7);
        this.sceneCtx.restore();
    }

    public drawExit(x: number, y: number, w: number, h: number): void {
        drawGlowRect(this.sceneCtx, x, y, w, h, '#FFB000', 3);
        drawGlowText(this.sceneCtx, 'EXIT', x + w / 2, y + h / 2, '#FFB000', '16px Orbitron', 'center');
    }
}
