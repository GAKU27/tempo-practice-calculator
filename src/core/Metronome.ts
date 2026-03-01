/**
 * Metronome - Web Audio API エンジン
 */
import { WakeLock } from './WakeLock';

export class Metronome {
    private audioContext: AudioContext | null = null;
    public isPlaying: boolean = false;
    private wakeLock: WakeLock;

    private currentBeatInBar: number = 0;
    private currentSubdivision: number = 0;
    private beatsPerBar: number = 4;
    private subdivision: number = 1; // 1=quarter, 2=eighth, 3=triplet, 4=sixteenth
    private tempo: number = 120;

    private lookahead: number = 25.0; // ms
    private scheduleAheadTime: number = 0.1; // seconds
    private nextNoteTime: number = 0.0;
    private timerID: number | null = null;

    private soundType: 'click' | 'wood' | 'beep' = 'click';
    private volume: number = 0.8; // 0.0 - 1.0

    private pendulumEnabled: boolean = true;
    private pendulumDirection: 'left' | 'right' = 'left';
    private pendulumArm: HTMLElement | null = null;

    private visualCallback: ((beatNumber: number, isMainBeat: boolean, isAccent: boolean) => void) | null = null;
    private pendulumCallback: ((direction: 'left' | 'right') => void) | null = null;

    constructor() {
        this.wakeLock = WakeLock.getInstance();
    }

    setVisualCallback(callback: (beatNumber: number, isMainBeat: boolean, isAccent: boolean) => void) {
        this.visualCallback = callback;
    }

    setPendulumCallback(callback: (direction: 'left' | 'right') => void) {
        this.pendulumCallback = callback;
    }

    private nextNote() {
        // Calculate time based on subdivision
        const baseSecondsPerBeat = 60.0 / this.tempo;
        const secondsPerNote = baseSecondsPerBeat / this.subdivision;
        this.nextNoteTime += secondsPerNote;

        this.currentSubdivision++;
        if (this.currentSubdivision >= this.subdivision) {
            this.currentSubdivision = 0;
            this.currentBeatInBar++;
            if (this.currentBeatInBar >= this.beatsPerBar) {
                this.currentBeatInBar = 0;
            }
        }
    }

    private scheduleNote(beatNumber: number, subdivisionNumber: number, time: number) {
        const isMainBeat = subdivisionNumber === 0;
        const isAccent = beatNumber === 0 && this.beatsPerBar > 0 && isMainBeat;

        // Visual feedback
        if (this.audioContext) {
            requestAnimationFrame(() => {
                const drawTime = (time - this.audioContext!.currentTime) * 1000;
                setTimeout(() => {
                    if (this.visualCallback) {
                        this.visualCallback(beatNumber, isMainBeat, isAccent);
                    }
                    if (isMainBeat) {
                        this.triggerPendulum();
                    }
                }, Math.max(0, drawTime));
            });
        }

        // Subdivision sounds
        switch (this.soundType) {
            case 'click':
                this.playClickSound(time, isAccent, isMainBeat);
                break;
            case 'wood':
                this.playWoodSound(time, isAccent, isMainBeat);
                break;
            case 'beep':
                this.playBeepSound(time, isAccent, isMainBeat);
                break;
            default:
                this.playClickSound(time, isAccent, isMainBeat);
        }
    }

    private playClickSound(time: number, isAccent: boolean, isMainBeat: boolean) {
        if (!this.audioContext) return;
        const osc = this.audioContext.createOscillator();
        const envelope = this.audioContext.createGain();

        osc.frequency.value = isAccent ? 1600.0 : 800.0;

        const baseVolume = isAccent ? 1.4 : (isMainBeat ? 0.9 : 0.4);
        envelope.gain.setValueAtTime(baseVolume * this.volume, time);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

        osc.connect(envelope);
        envelope.connect(this.audioContext.destination);

        osc.start(time);
        osc.stop(time + 0.03);
    }

    private playWoodSound(time: number, isAccent: boolean, isMainBeat: boolean) {
        if (!this.audioContext) return;
        const baseVolume = isAccent ? 1.5 : (isMainBeat ? 0.9 : 0.4);

        // メイン音
        const osc = this.audioContext.createOscillator();
        const envelope = this.audioContext.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isAccent ? 1600 : 800, time);
        osc.frequency.exponentialRampToValueAtTime(isAccent ? 600 : 200, time + 0.015);

        envelope.gain.setValueAtTime((isAccent ? 0.8 : 0.4) * baseVolume * this.volume, time);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        osc.connect(envelope);
        envelope.connect(this.audioContext.destination);

        osc.start(time);
        osc.stop(time + 0.05);

        // アタック音
        const click = this.audioContext.createOscillator();
        const clickEnv = this.audioContext.createGain();

        click.type = 'square';
        click.frequency.value = isAccent ? 2400 : 1600;

        clickEnv.gain.setValueAtTime((isAccent ? 0.4 : 0.2) * baseVolume * this.volume, time);
        clickEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.01);

        click.connect(clickEnv);
        clickEnv.connect(this.audioContext.destination);

        click.start(time);
        click.stop(time + 0.02);
    }

    private playBeepSound(time: number, isAccent: boolean, isMainBeat: boolean) {
        if (!this.audioContext) return;
        const osc = this.audioContext.createOscillator();
        const envelope = this.audioContext.createGain();

        osc.type = 'sine';
        // ピープ音は少し電子的な音
        osc.frequency.value = isAccent ? 1200.0 : 600.0;

        const baseVolume = isAccent ? 1.5 : (isMainBeat ? 0.8 : 0.4);
        envelope.gain.setValueAtTime(0.5 * baseVolume * this.volume, time);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

        osc.connect(envelope);
        envelope.connect(this.audioContext.destination);

        osc.start(time);
        osc.stop(time + 0.1);
    }

    private scheduler() {
        if (!this.audioContext) return;
        while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentBeatInBar, this.currentSubdivision, this.nextNoteTime);
            this.nextNote();
        }
        this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
    }

    public start() {
        if (this.isPlaying) return;

        if (!this.audioContext) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.audioContext = new AudioContextClass();
        }

        const unlockAudio = (): Promise<void> => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                return this.audioContext.resume();
            }
            return Promise.resolve();
        };

        const warmupAudio = () => {
            if (!this.audioContext) return;
            const buffer = this.audioContext.createBuffer(1, 1, 22050);
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);
            source.start(0);
        };

        unlockAudio()
            .then(() => {
                warmupAudio();
                this._startPlayback();
            })
            .catch((err) => {
                console.log('Audio unlock failed:', err);
                this._startPlayback();
            });
    }

    private _startPlayback() {
        if (!this.audioContext) return;
        this.isPlaying = true;
        this.wakeLock.requestWakeLock();
        this.currentBeatInBar = 0;
        this.currentSubdivision = 0;
        this.nextNoteTime = this.audioContext.currentTime + 0.1;
        this.scheduler();
    }

    public stop() {
        this.isPlaying = false;
        this.wakeLock.releaseWakeLock();
        if (this.timerID !== null) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
    }

    public setTempo(bpm: number) {
        this.tempo = bpm;
    }

    public setBeatsPerBar(beats: number) {
        this.beatsPerBar = beats;
    }

    public setSoundType(type: 'click' | 'wood' | 'beep') {
        this.soundType = type;
    }

    public setVolume(value: number) {
        this.volume = value;
    }

    public setSubdivision(value: number) {
        this.subdivision = value;
    }

    public setPendulumEnabled(enabled: boolean) {
        this.pendulumEnabled = enabled;
    }

    private triggerPendulum() {
        if (!this.pendulumEnabled) return;

        if (this.pendulumDirection === 'left') {
            this.pendulumDirection = 'right';
        } else {
            this.pendulumDirection = 'left';
        }

        if (this.pendulumCallback) {
            this.pendulumCallback(this.pendulumDirection);
        }
    }
}
