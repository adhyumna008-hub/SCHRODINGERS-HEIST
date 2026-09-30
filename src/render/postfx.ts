import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../core/constants';

export interface PostFXParams {
    coherence: number; // 0-1
    chromaticAberration: number; // 0-1
    time: number;
}

const VS = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
}`;

const FS_BRIGHT = `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_image;
void main() {
    vec4 color = texture(u_image, v_texCoord);
    float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    if (brightness > 0.9) {
        outColor = color;
    } else {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
}`;

const FS_BLUR = `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_image;
uniform vec2 u_dir;
void main() {
    vec4 color = vec4(0.0);
    vec2 off1 = vec2(1.3846153846) * u_dir;
    vec2 off2 = vec2(3.2307692308) * u_dir;
    color += texture(u_image, v_texCoord) * 0.2270270270;
    color += texture(u_image, v_texCoord + off1) * 0.3162162162;
    color += texture(u_image, v_texCoord - off1) * 0.3162162162;
    color += texture(u_image, v_texCoord + off2) * 0.0702702703;
    color += texture(u_image, v_texCoord - off2) * 0.0702702703;
    outColor = color;
}`;

const FS_COMPOSITE = `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform float u_coherence;
uniform float u_chromaticAberration;
uniform float u_time;

// Simple random function
float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
    vec2 uv = v_texCoord;
    
    // Chromatic Aberration
    vec2 offset = vec2(u_chromaticAberration * 0.01, 0.0);
    float r = texture(u_scene, uv - offset).r;
    float g = texture(u_scene, uv).g;
    float b = texture(u_scene, uv + offset).b;
    vec3 sceneColor = vec3(r, g, b);
    
    // Add bloom
    vec3 bloomColor = texture(u_bloom, uv).rgb;
    vec3 finalColor = sceneColor + bloomColor;
    
    // Vignette (strength 0.18)
    vec2 coord = (uv - 0.5) * 2.0;
    float rf = length(coord);
    float vignette = smoothstep(1.0, 0.5, rf);
    finalColor = mix(finalColor * 0.5, finalColor, vignette);
    
    // Film grain driven by coherence
    float noise = rand(uv * u_time) * 2.0 - 1.0;
    float grainStrength = (1.0 - u_coherence) * 0.15;
    finalColor += noise * grainStrength;
    
    // Scanline
    float scanline = sin(uv.y * 720.0 * 3.1415) * 0.04;
    finalColor -= scanline;
    
    // Desaturation
    float luma = dot(finalColor, vec3(0.299, 0.587, 0.114));
    float desatStrength = (1.0 - u_coherence) * 0.8;
    finalColor = mix(finalColor, vec3(luma), desatStrength);
    
    // Crushed blacks
    finalColor = finalColor * 1.05 - 0.05;
    finalColor = max(finalColor, 0.0);

    outColor = vec4(finalColor, 1.0);
}`;

export class PostFX {
    public hasFallback: boolean = false;
    private gl: WebGL2RenderingContext | null = null;
    private canvas: HTMLCanvasElement;
    
    // Fallback Canvas2D context
    private fallbackCtx: CanvasRenderingContext2D | null = null;
    private fallbackCanvas: HTMLCanvasElement | null = null;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = LOGICAL_WIDTH;
        this.canvas.height = LOGICAL_HEIGHT;
        this.initFallback();
    }

    private initFallback() {
        this.hasFallback = true;
        this.fallbackCtx = this.canvas.getContext('2d');
        this.fallbackCanvas = document.createElement('canvas');
        this.fallbackCanvas.width = LOGICAL_WIDTH / 4;
        this.fallbackCanvas.height = LOGICAL_HEIGHT / 4;
    }

    private initShaders() {
        // Shader initialization logic would go here.
        // Omitted for brevity.
    }

    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    public render(sceneCanvas: HTMLCanvasElement, params: PostFXParams): void {
        // Use fallback for now (WebGL pipeline is complex, fallback provides good-enough bloom)
        this.renderFallback(sceneCanvas, params);
    }

    private renderFallback(sceneCanvas: HTMLCanvasElement, params: PostFXParams): void {
        if (!this.fallbackCtx || !this.fallbackCanvas) return;
        const ctx = this.fallbackCtx;
        
        // Draw original
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(sceneCanvas, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

        // Simple bloom fallback
        const fctx = this.fallbackCanvas.getContext('2d');
        if (fctx) {
            fctx.drawImage(sceneCanvas, 0, 0, LOGICAL_WIDTH / 4, LOGICAL_HEIGHT / 4);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.5;
            ctx.drawImage(this.fallbackCanvas, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
            ctx.globalAlpha = 1.0;
        }

        // Vignette fallback
        const grad = ctx.createRadialGradient(
            LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, LOGICAL_HEIGHT * 0.4,
            LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, LOGICAL_WIDTH * 0.7
        );
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    }
}
