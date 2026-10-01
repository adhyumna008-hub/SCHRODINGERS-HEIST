// Post-processing: bloom, vignette, grain, chromatic aberration
// Uses WebGL2 when available, Canvas 2D fallback otherwise
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../core/constants';

export interface PostFXParams {
  coherence: number;       // 0-1
  chromaticAberration: number; // 0-1
  time: number;
}

export class PostFX {
  private canvas: HTMLCanvasElement;
  private glCanvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private fallbackCtx: CanvasRenderingContext2D | null = null;
  private blurCanvas: HTMLCanvasElement;
  private blurCtx: CanvasRenderingContext2D | null = null;

  // WebGL resources
  private sceneTexture: WebGLTexture | null = null;
  private bloomTexture: WebGLTexture | null = null;
  private bloomFBO: WebGLFramebuffer | null = null;
  private bloomTexture2: WebGLTexture | null = null;
  private bloomFBO2: WebGLFramebuffer | null = null;
  private brightProgram: WebGLProgram | null = null;
  private blurProgram: WebGLProgram | null = null;
  private compositeProgram: WebGLProgram | null = null;
  private quadVAO: WebGLVertexArrayObject | null = null;
  private useWebGL = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = LOGICAL_WIDTH;
    this.canvas.height = LOGICAL_HEIGHT;
    
    this.glCanvas = document.createElement('canvas');
    this.glCanvas.width = LOGICAL_WIDTH;
    this.glCanvas.height = LOGICAL_HEIGHT;

    this.blurCanvas = document.createElement('canvas');
    this.blurCanvas.width = Math.floor(LOGICAL_WIDTH / 4);
    this.blurCanvas.height = Math.floor(LOGICAL_HEIGHT / 4);

    try {
      this.gl = this.glCanvas.getContext('webgl2', { premultipliedAlpha: false });
      if (this.gl) {
        this.initWebGL();
        this.useWebGL = true;
      } else {
        this.initFallback();
      }
    } catch {
      this.initFallback();
    }
  }

  private initFallback() {
    this.useWebGL = false;
    this.fallbackCtx = this.canvas.getContext('2d');
    this.blurCtx = this.blurCanvas.getContext('2d');
  }

  private initWebGL() {
    const gl = this.gl!;
    const hw = Math.floor(LOGICAL_WIDTH / 2);
    const hh = Math.floor(LOGICAL_HEIGHT / 2);

    // Scene texture (uploaded each frame)
    this.sceneTexture = this.createTexture(gl, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Bloom FBOs at half resolution
    this.bloomTexture = this.createTexture(gl, hw, hh);
    this.bloomFBO = this.createFBO(gl, this.bloomTexture);
    this.bloomTexture2 = this.createTexture(gl, hw, hh);
    this.bloomFBO2 = this.createFBO(gl, this.bloomTexture2);

    // Shaders
    this.brightProgram = this.createProgram(gl, VS_QUAD, FS_BRIGHT);
    this.blurProgram = this.createProgram(gl, VS_QUAD, FS_BLUR);
    this.compositeProgram = this.createProgram(gl, VS_QUAD, FS_COMPOSITE);

    // Full-screen quad VAO
    this.quadVAO = gl.createVertexArray();
    gl.bindVertexArray(this.quadVAO);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    // pos(x,y), uv(s,t)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 0, 0,
       1, -1, 1, 0,
      -1,  1, 0, 1,
       1,  1, 1, 1,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    gl.bindVertexArray(null);
  }

  private createTexture(gl: WebGL2RenderingContext, w: number, h: number): WebGLTexture {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private createFBO(gl: WebGL2RenderingContext, tex: WebGLTexture): WebGLFramebuffer {
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fbo;
  }

  private createProgram(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
    const prog = gl.createProgram()!;
    const vShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vShader, vs);
    gl.compileShader(vShader);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fShader, fs);
    gl.compileShader(fShader);
    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    return prog;
  }

  private drawQuad(gl: WebGL2RenderingContext) {
    gl.bindVertexArray(this.quadVAO);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.useWebGL ? this.glCanvas : this.canvas;
  }

  public render(sceneCanvas: HTMLCanvasElement, params: PostFXParams): void {
    if (this.useWebGL && this.gl) {
      this.renderWebGL(sceneCanvas, params);
    } else {
      this.renderFallback(sceneCanvas, params);
    }
  }

  private renderWebGL(sceneCanvas: HTMLCanvasElement, params: PostFXParams): void {
    const gl = this.gl!;
    const w = LOGICAL_WIDTH;
    const h = LOGICAL_HEIGHT;
    const hw = Math.floor(w / 2);
    const hh = Math.floor(h / 2);

    // Upload scene
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sceneCanvas);

    // 1) Bright pass → bloomFBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomFBO);
    gl.viewport(0, 0, hw, hh);
    gl.useProgram(this.brightProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);
    gl.uniform1i(gl.getUniformLocation(this.brightProgram!, 'u_image'), 0);
    this.drawQuad(gl);

    // 2) Horizontal blur → bloomFBO2
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomFBO2);
    gl.useProgram(this.blurProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.bloomTexture);
    gl.uniform1i(gl.getUniformLocation(this.blurProgram!, 'u_image'), 0);
    gl.uniform2f(gl.getUniformLocation(this.blurProgram!, 'u_dir'), 1.0 / hw, 0);
    this.drawQuad(gl);

    // 3) Vertical blur → bloomFBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomFBO);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.bloomTexture2);
    gl.uniform2f(gl.getUniformLocation(this.blurProgram!, 'u_dir'), 0, 1.0 / hh);
    this.drawQuad(gl);

    // 4) Composite to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.compositeProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);
    gl.uniform1i(gl.getUniformLocation(this.compositeProgram!, 'u_scene'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.bloomTexture);
    gl.uniform1i(gl.getUniformLocation(this.compositeProgram!, 'u_bloom'), 1);

    gl.uniform1f(gl.getUniformLocation(this.compositeProgram!, 'u_coherence'), params.coherence);
    gl.uniform1f(gl.getUniformLocation(this.compositeProgram!, 'u_chromaticAberration'), params.chromaticAberration);
    gl.uniform1f(gl.getUniformLocation(this.compositeProgram!, 'u_time'), params.time);

    this.drawQuad(gl);
  }

  private renderFallback(sceneCanvas: HTMLCanvasElement, params: PostFXParams): void {
    if (!this.fallbackCtx || !this.blurCtx) return;
    const ctx = this.fallbackCtx;
    const bctx = this.blurCtx;

    // Draw original scene
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(sceneCanvas, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Bloom: downscale → additive composite
    bctx.drawImage(sceneCanvas, 0, 0, this.blurCanvas.width, this.blurCanvas.height);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35;
    ctx.drawImage(this.blurCanvas, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.globalAlpha = 1;

    // Vignette
    ctx.globalCompositeOperation = 'source-over';
    const grad = ctx.createRadialGradient(
      LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, LOGICAL_HEIGHT * 0.35,
      LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, LOGICAL_WIDTH * 0.75
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Film grain (driven by coherence)
    if (params.coherence < 0.8) {
      const grainAlpha = (1 - params.coherence) * 0.08;
      ctx.globalAlpha = grainAlpha;
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 60; i++) {
        const gx = Math.random() * LOGICAL_WIDTH;
        const gy = Math.random() * LOGICAL_HEIGHT;
        ctx.fillRect(gx, gy, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }
}

// ── GLSL Shaders ──

const VS_QUAD = `#version 300 es
layout(location=0) in vec2 a_pos;
layout(location=1) in vec2 a_uv;
out vec2 v_uv;
void main(){ gl_Position=vec4(a_pos,0,1); v_uv=a_uv; }`;

const FS_BRIGHT = `#version 300 es
precision mediump float;
in vec2 v_uv; out vec4 o;
uniform sampler2D u_image;
void main(){
  vec4 c=texture(u_image,v_uv);
  float b=dot(c.rgb,vec3(.2126,.7152,.0722));
  o = b>0.65 ? c : vec4(0,0,0,1);
}`;

const FS_BLUR = `#version 300 es
precision mediump float;
in vec2 v_uv; out vec4 o;
uniform sampler2D u_image;
uniform vec2 u_dir;
void main(){
  vec4 c=vec4(0);
  vec2 o1=1.3846153846*u_dir;
  vec2 o2=3.2307692308*u_dir;
  c+=texture(u_image,v_uv)*.2270270270;
  c+=texture(u_image,v_uv+o1)*.3162162162;
  c+=texture(u_image,v_uv-o1)*.3162162162;
  c+=texture(u_image,v_uv+o2)*.0702702703;
  c+=texture(u_image,v_uv-o2)*.0702702703;
  o=c;
}`;

const FS_COMPOSITE = `#version 300 es
precision mediump float;
in vec2 v_uv; out vec4 o;
uniform sampler2D u_scene, u_bloom;
uniform float u_coherence, u_chromaticAberration, u_time;
float rand(vec2 co){return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 uv=v_uv;
  // Chromatic aberration
  vec2 ca=vec2(u_chromaticAberration*.012,0);
  float r=texture(u_scene,uv-ca).r;
  float g=texture(u_scene,uv).g;
  float b=texture(u_scene,uv+ca).b;
  vec3 col=vec3(r,g,b);
  // Bloom additive
  col+=texture(u_bloom,uv).rgb*.6;
  // Vignette 0.18
  vec2 vc=(uv-.5)*2.0;
  float vf=1.0-dot(vc,vc)*.35;
  col*=clamp(vf,0.0,1.0);
  // Film grain
  float n=rand(uv*u_time)*2.-1.;
  col+=n*(1.-u_coherence)*.12;
  // Subtle scanline
  col-=sin(uv.y*720.*3.14159)*.025;
  // Desaturation
  float lum=dot(col,vec3(.299,.587,.114));
  col=mix(col,vec3(lum),(1.-u_coherence)*.6);
  // Crushed blacks
  col=max(col*1.04-.04, vec3(0));
  o=vec4(col,1);
}`;
