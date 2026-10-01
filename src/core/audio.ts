export class AudioManager {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private muted: boolean = false;

    private initContext() {
        if (!this.ctx) {
            try {
                const AC = (typeof window !== 'undefined') 
                    ? (window.AudioContext || (window as any).webkitAudioContext)
                    : null;
                if (!AC) return;
                this.ctx = new AC();
                this.masterGain = this.ctx.createGain();
                this.masterGain.connect(this.ctx.destination);
                this.updateMuteState();
            } catch {
                return;
            }
        }
        if (this.ctx?.state === 'suspended') {
            this.ctx.resume();
        }
    }

    private updateMuteState() {
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 0.5;
        }
    }

    public toggleMute() {
        this.muted = !this.muted;
        this.updateMuteState();
    }

    public isMuted() {
        return this.muted;
    }
    
    private playOscillator(type: OscillatorType, startFreq: number, endFreq: number, duration: number, vol: number = 1) {
        this.initContext();
        if (!this.ctx || !this.masterGain) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
        if (startFreq !== endFreq) {
            osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
        }
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    public playSplit() {
        this.initContext();
        if (!this.ctx || !this.masterGain) return;

        const now = this.ctx.currentTime;
        
        // C5 (523.25) to E5 (659.25), 100ms each
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.value = 523.25;
        gain1.gain.setValueAtTime(1, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc1.connect(gain1);
        gain1.connect(this.masterGain);
        osc1.start(now);
        osc1.stop(now + 0.1);

        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = 659.25;
        gain2.gain.setValueAtTime(1, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.2);
    }

    public playSwitch() {
        this.playOscillator('square', 800, 800, 0.03, 0.2);
    }

    public playWarningBeep(urgency: number) {
        // urgency 0-1
        const freq = 400 + urgency * 400;
        this.playOscillator('square', freq, freq, 0.1, 0.3);
    }

    public playClonePing() {
        this.playOscillator('sine', 880, 1108.73, 0.15, 0.4);
    }

    public playCollapseThud() {
        this.playOscillator('sine', 60, 20, 0.2, 1.0);
    }

    public playGateSolve() {
        this.playOscillator('triangle', 1046.50, 1567.98, 0.3, 0.3);
    }

    public playLaserHum(): () => void {
        this.initContext();
        if (!this.ctx || !this.masterGain) return () => {};
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.value = 80;
        
        gain.gain.value = 0.05;
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        
        return () => {
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.1);
            osc.stop(this.ctx!.currentTime + 0.1);
        };
    }

    public playTeleportPulse() {
        this.playOscillator('square', 200, 200, 0.05, 0.2);
        setTimeout(() => this.playOscillator('square', 200, 200, 0.05, 0.2), 100);
        setTimeout(() => this.playOscillator('square', 200, 200, 0.05, 0.2), 200);
        setTimeout(() => this.playOscillator('sine', 400, 50, 0.4, 0.5), 300);
    }

    public playRoomClear() {
        // Major chord arpeggio
        this.playOscillator('sine', 261.63, 261.63, 0.1); // C4
        setTimeout(() => this.playOscillator('sine', 329.63, 329.63, 0.1), 100); // E4
        setTimeout(() => this.playOscillator('sine', 392.00, 392.00, 0.1), 200); // G4
        setTimeout(() => this.playOscillator('sine', 523.25, 523.25, 0.4), 300); // C5
    }

    public playUIBlip() {
        this.playOscillator('sine', 600, 600, 0.05, 0.2);
    }

    public playHeartbeat() {
        this.playOscillator('sine', 50, 40, 0.3, 0.8);
        setTimeout(() => this.playOscillator('sine', 50, 40, 0.3, 0.8), 300);
    }
}

export const audioManager = new AudioManager();
