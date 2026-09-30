// Canvas 2D utilities for the neon glow aesthetic

export const DEFAULT_GLOW_COLOR = '#4DE8FF';
export const DEFAULT_GLOW_BLUR = 12;

export function setGlow(ctx: CanvasRenderingContext2D, color: string = DEFAULT_GLOW_COLOR, blur: number = DEFAULT_GLOW_BLUR): void {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
}

export function clearGlow(ctx: CanvasRenderingContext2D): void {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
}

export function drawGlowLine(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number, x2: number, y2: number,
    color: string = DEFAULT_GLOW_COLOR,
    width: number = 2,
    glowWidth: number = width * 3,
    alpha: number = 1.0
): void {
    ctx.lineCap = 'round';
    
    // Outer wide glow
    ctx.globalAlpha = alpha * 0.3;
    ctx.strokeStyle = color;
    ctx.lineWidth = glowWidth;
    setGlow(ctx, color, DEFAULT_GLOW_BLUR);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Inner core
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.strokeStyle = '#FFFFFF';
    clearGlow(ctx);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    ctx.globalAlpha = 1.0;
}

export function drawGlowRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    color: string = DEFAULT_GLOW_COLOR,
    lineWidth: number = 2
): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth * 3;
    ctx.globalAlpha = 0.3;
    setGlow(ctx, color, DEFAULT_GLOW_BLUR);
    ctx.strokeRect(x, y, w, h);
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = 1.0;
    clearGlow(ctx);
    ctx.strokeRect(x, y, w, h);
}

export function drawGlowCircle(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, r: number,
    color: string = DEFAULT_GLOW_COLOR,
    lineWidth: number = 2
): void {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth * 3;
    ctx.globalAlpha = 0.3;
    setGlow(ctx, color, DEFAULT_GLOW_BLUR);
    ctx.stroke();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = 1.0;
    clearGlow(ctx);
    ctx.stroke();
}

export function drawGlowPolygon(
    ctx: CanvasRenderingContext2D,
    points: {x: number, y: number}[],
    color: string = DEFAULT_GLOW_COLOR,
    lineWidth: number = 2
): void {
    if (points.length < 2) return;
    
    const drawPath = () => {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.stroke();
    };

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth * 3;
    ctx.globalAlpha = 0.3;
    setGlow(ctx, color, DEFAULT_GLOW_BLUR);
    drawPath();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = 1.0;
    clearGlow(ctx);
    drawPath();
}

export function drawGlowText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number, y: number,
    color: string = DEFAULT_GLOW_COLOR,
    font: string = '20px Orbitron',
    align: CanvasTextAlign = 'left'
): void {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    
    ctx.fillStyle = color;
    setGlow(ctx, color, DEFAULT_GLOW_BLUR);
    ctx.fillText(text, x, y);
    
    clearGlow(ctx);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, x, y);
}

export function drawDashedGlowCircle(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, r: number,
    color: string = DEFAULT_GLOW_COLOR,
    dashLen: number = 10,
    rotation: number = 0
): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.setLineDash([dashLen, dashLen]);
    
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.globalAlpha = 0.3;
    setGlow(ctx, color, DEFAULT_GLOW_BLUR);
    ctx.stroke();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 1.0;
    clearGlow(ctx);
    ctx.stroke();
    
    ctx.restore();
}
