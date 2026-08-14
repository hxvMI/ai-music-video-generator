"use client";

import { useEffect, useRef } from "react";
import type { VisualizerVariant } from "@/lib/videoThemePresets";

type AudioVisualizerProps = {
    audioElement: HTMLAudioElement | null;
    isPlaying: boolean;
    visualizerColor: string;
    variant?: VisualizerVariant;
    reactiveIntensity?: number;
};

const VISUALIZER_SETTINGS: Record<
    VisualizerVariant,
    {
        barCount: number;
        gap: number;
        minHeight: number;
        heightScale: number;
        ceilingPadding: number;
        shadowBlur: number;
        mirrorFromCenter: boolean;
    }
> = {
    minimal: {
        barCount: 42,
        gap: 3,
        minHeight: 5,
        heightScale: 0.58,
        ceilingPadding: 0.82,
        shadowBlur: 0,
        mirrorFromCenter: false,
    },
    neon: {
        barCount: 54,
        gap: 2,
        minHeight: 7,
        heightScale: 0.72,
        ceilingPadding: 0.86,
        shadowBlur: 14,
        mirrorFromCenter: false,
    },
    cinematic: {
        barCount: 34,
        gap: 4,
        minHeight: 4,
        heightScale: 0.46,
        ceilingPadding: 0.62,
        shadowBlur: 0,
        mirrorFromCenter: true,
    },
    waveform: {
        barCount: 60,
        gap: 2,
        minHeight: 5,
        heightScale: 0.44,
        ceilingPadding: 0.66,
        shadowBlur: 8,
        mirrorFromCenter: true,
    },
    spectrum: {
        barCount: 70,
        gap: 2,
        minHeight: 7,
        heightScale: 0.78,
        ceilingPadding: 0.9,
        shadowBlur: 18,
        mirrorFromCenter: false,
    },
    stacked: {
        barCount: 46,
        gap: 3,
        minHeight: 8,
        heightScale: 0.68,
        ceilingPadding: 0.84,
        shadowBlur: 10,
        mirrorFromCenter: false,
    },
    radial: {
        barCount: 56,
        gap: 2,
        minHeight: 6,
        heightScale: 0.62,
        ceilingPadding: 0.78,
        shadowBlur: 14,
        mirrorFromCenter: true,
    },
    ribbon: {
        barCount: 72,
        gap: 2,
        minHeight: 4,
        heightScale: 0.5,
        ceilingPadding: 0.68,
        shadowBlur: 10,
        mirrorFromCenter: true,
    },
    cityscape: {
        barCount: 64,
        gap: 2,
        minHeight: 8,
        heightScale: 0.82,
        ceilingPadding: 0.9,
        shadowBlur: 16,
        mirrorFromCenter: false,
    },
};

function getMirroredFrequencyValue(dataArray: Uint8Array, index: number, barCount: number) {
    const halfBarCount = Math.ceil(barCount / 2);
    const mirroredIndex = index < halfBarCount ? index : barCount - 1 - index;
    const usefulFrequencyBins = Math.floor(dataArray.length * 0.72);
    const start = Math.floor((mirroredIndex / halfBarCount) * usefulFrequencyBins);
    const end = Math.max(start + 1, Math.floor(((mirroredIndex + 1) / halfBarCount) * usefulFrequencyBins));
    const bucket = dataArray.slice(start, end);

    return bucket.reduce((total, value) => total + value, 0) / bucket.length;
}

function compressFrequencyHeight(value: number, canvasHeight: number, minHeight: number, heightScale: number) {
    const normalizedValue = Math.min(value / 255, 1);

    // LESSON CHECKPOINT:
    // Raw audio values are not visually balanced. Square-root compression makes
    // quiet sounds visible while preventing loud sections from pinning every bar
    // against the top of the canvas.
    return Math.max(minHeight, Math.sqrt(normalizedValue) * canvasHeight * heightScale);
}


export default function AudioVisualizer({
    audioElement,
    isPlaying,
    visualizerColor,
    variant = "minimal",
    reactiveIntensity = 0,
}: AudioVisualizerProps){

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const connectedAudioRef = useRef<HTMLAudioElement | null>(null);
    const animationRef = useRef<number | null>(null);

    // AUDIO VISUALIZER
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    //Why useRef? we need direct access to the canvas DOM element 
    //and we don't want changes to the canvas to cause re-renders
    //useRef, stores DOM elements and mutable objects for accessing later

    //Audio -> analyser -> speakers
    useEffect(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;

        const ctx = canvas.getContext("2d");
        if(!ctx) return;

        const settings = VISUALIZER_SETTINGS[variant];

        // Canvas has two sizes:
        // 1. CSS size: how big it looks on the page.
        // 2. Drawing size: how many pixels we draw into.
        // Matching them keeps the visualizer sharp on high-DPI screens.
        const resizeCanvas = () => {
            const bounds = canvas.getBoundingClientRect();
            const pixelRatio = window.devicePixelRatio || 1;
            canvas.width = Math.max(1, Math.floor(bounds.width * pixelRatio));
            canvas.height = Math.max(1, Math.floor(bounds.height * pixelRatio));
        };

        resizeCanvas();

        if(!audioElement){
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        // =========================
        // AUDIO CONTEXT
        // =========================
        if(!audioContextRef.current){
            audioContextRef.current = new AudioContext();
        }

        const audioContext = audioContextRef.current;

        // =========================
        // ANALYSER
        // =========================
        if(!analyserRef.current){
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            analyserRef.current = analyser;
        }

        const analyser = analyserRef.current!;

        // =========================
        // SOURCE
        // =========================
        if(connectedAudioRef.current !== audioElement){
            sourceRef.current?.disconnect();
            analyser.disconnect();

            const source =
                audioContext.createMediaElementSource(audioElement);

            sourceRef.current = source;
            connectedAudioRef.current = audioElement;

            source.connect(analyser);
            analyser.connect(audioContext.destination);
        }

        //We use Uint8Array cuse frequency data is 0 -> 255 value
        const dataArray = new Uint8Array(
            analyser.frequencyBinCount
        );

        //Animation loop
        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataArray);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const availableWidth = canvas.width - settings.gap * (settings.barCount - 1);
            const barWidth = availableWidth / settings.barCount;
            const maxHeight = canvas.height * settings.ceilingPadding;

            ctx.fillStyle = visualizerColor;
            ctx.shadowColor = visualizerColor;
            ctx.shadowBlur = settings.shadowBlur;

            Array.from({ length: settings.barCount }, (_, i) => {
                const average = getMirroredFrequencyValue(
                    dataArray,
                    i,
                    settings.barCount
                );
                const height = Math.min(
                    maxHeight,
                    compressFrequencyHeight(
                        average,
                        canvas.height,
                        settings.minHeight,
                        settings.heightScale * (0.85 + reactiveIntensity * 0.55)
                    )
                );
                const x = i * (barWidth + settings.gap);

                if (settings.mirrorFromCenter) {
                    const centerY = canvas.height / 2;
                    ctx.fillRect(x, centerY - height / 2, barWidth, height);
                    return;
                }

                ctx.fillRect(x, canvas.height - height, barWidth, height);
            });

            ctx.shadowBlur = 0;
        };

        if(isPlaying){
            audioContext.resume();
            draw();
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        return () => {
            if(animationRef.current !== null){
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        };

    }, [audioElement, isPlaying, visualizerColor, variant, reactiveIntensity]);
    // IMPORTANT: must depend on the shared audio element

    return(
        <canvas
            ref={canvasRef}
            className="h-24 w-full rounded border border-white/20 bg-black/20"
        />
    );
}
