import { drawGlowText } from './glow';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../core/constants';

export class HUDRenderer {
    public drawCoherenceGauge(ctx: CanvasRenderingContext2D, coherence: number, maxCoherence: number): void {
        const percent = Math.max(0, Math.min(1, coherence / maxCoherence));
        const width = 300;
        const height = 15;
        const x = 30;
        const y = LOGICAL_HEIGHT - 45;

        // Label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Exo 2';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`COHERENCE ${Math.floor(percent * 100)}% (drains while split)`, x, y - 5);

        // Bar outline
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Ticks
        ctx.fillStyle = '#555555';
        [0.1, 0.3, 0.6].forEach(p => {
            ctx.fillRect(x + width * p - 1, y - 4, 2, height + 8);
        });

        // Fill color
        let color = '#4DE8FF';
        if (percent <= 0.3) color = '#FF0000';
        else if (percent <= 0.6) color = '#FFB000';

        ctx.fillStyle = color;
        ctx.fillRect(x + 2, y + 2, (width - 4) * percent, height - 4);
    }

    public drawControlsHint(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = '14px Rajdhani';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('[Space] Split  [Tab] Switch  [Q] Decohere  [R] Recall', LOGICAL_WIDTH - 30, LOGICAL_HEIGHT - 30);
    }

    public drawChapterLabel(ctx: CanvasRenderingContext2D, text: string, color: string): void {
        drawGlowText(ctx, text, 30, 30, color, '24px Orbitron', 'left');
    }

    public drawProgressDots(ctx: CanvasRenderingContext2D, current: number, total: number): void {
        const radius = 6;
        const spacing = 20;
        const startX = LOGICAL_WIDTH - 30 - (total - 1) * spacing;
        const y = 30;

        for (let i = 0; i < total; i++) {
            ctx.beginPath();
            ctx.arc(startX + i * spacing, y, radius, 0, Math.PI * 2);
            if (i < current) {
                ctx.fillStyle = '#4DE8FF';
                ctx.fill();
            } else {
                ctx.strokeStyle = '#555555';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }

    public drawWarningOverlay(ctx: CanvasRenderingContext2D, intensity: number): void {
        if (intensity <= 0) return;
        const grad = ctx.createRadialGradient(
            LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, LOGICAL_HEIGHT * 0.4,
            LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, LOGICAL_WIDTH * 0.7
        );
        grad.addColorStop(0, 'rgba(255, 0, 0, 0)');
        grad.addColorStop(1, `rgba(255, 0, 0, ${intensity * 0.5})`);
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    }

    public drawMeasuredText(ctx: CanvasRenderingContext2D): void {
        drawGlowText(ctx, 'MEASURED', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, '#FF0000', '64px Orbitron', 'center');
    }

    public drawBranchPrunedText(ctx: CanvasRenderingContext2D): void {
        drawGlowText(ctx, 'BRANCH PRUNED', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 80, '#FF0000', '32px Orbitron', 'center');
    }

    public drawRoomClearCard(ctx: CanvasRenderingContext2D, roomName: string, stars: number, time: string, coherence: number, labNote: string): void {
        const cx = LOGICAL_WIDTH / 2;
        const cy = LOGICAL_HEIGHT / 2;
        const w = 400;
        const h = 300;

        ctx.fillStyle = 'rgba(5, 7, 11, 0.85)';
        ctx.fillRect(cx - w/2, cy - h/2, w, h);
        ctx.strokeStyle = '#4DE8FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - w/2, cy - h/2, w, h);

        drawGlowText(ctx, 'ROOM CLEARED', cx, cy - h/2 + 40, '#4DE8FF', '28px Orbitron', 'center');
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Exo 2';
        ctx.textAlign = 'center';
        ctx.fillText(`Room: ${roomName}`, cx, cy - 40);
        ctx.fillText(`Time: ${time}`, cx, cy - 10);
        ctx.fillText(`Coherence Remaining: ${Math.floor(coherence)}%`, cx, cy + 20);
        
        let starText = '';
        for (let i = 0; i < stars; i++) starText += '★ ';
        for (let i = stars; i < 3; i++) starText += '☆ ';
        drawGlowText(ctx, starText, cx, cy + 60, '#FFB000', '24px Orbitron', 'center');
        
        ctx.fillStyle = '#AAAAAA';
        ctx.font = 'italic 14px Rajdhani';
        ctx.fillText(`Lab Note: "${labNote}"`, cx, cy + 110);
    }

    public drawChapterCard(ctx: CanvasRenderingContext2D, chapterNum: number, title: string, subtitle: string, color: string): void {
        const cx = LOGICAL_WIDTH / 2;
        const cy = LOGICAL_HEIGHT / 2;
        
        ctx.fillStyle = 'rgba(5, 7, 11, 0.9)';
        ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

        drawGlowText(ctx, `CHAPTER ${chapterNum}`, cx, cy - 60, color, '32px Orbitron', 'center');
        drawGlowText(ctx, title, cx, cy, '#FFFFFF', '64px Orbitron', 'center');
        
        ctx.fillStyle = '#AAAAAA';
        ctx.font = '24px Rajdhani';
        ctx.textAlign = 'center';
        ctx.fillText(subtitle, cx, cy + 60);
    }
}
