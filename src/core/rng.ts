export class SeededRNG {
    private state: number;

    constructor(seed: number = 0) {
        this.state = seed;
    }

    public seed(seed: number) {
        this.state = seed;
    }

    // Mulberry32
    public next(): number {
        this.state |= 0;
        this.state = this.state + 0x6D2B79F5 | 0;
        let t = Math.imul(this.state ^ this.state >>> 15, 1 | this.state);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    public nextRange(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    public nextInt(min: number, max: number): number {
        return Math.floor(this.nextRange(min, max));
    }
}
