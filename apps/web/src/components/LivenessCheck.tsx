/**
 * Live face check (shown before a protected gallery opens).
 *
 * A guided, step-by-step flow — the guest is always told what to do next and
 * nothing is captured until they say they're ready:
 *
 *   intro      what will happen + tips
 *   position   camera on, face in the oval → guest presses "I'm ready"
 *   countdown  3-2-1 "look straight at the camera"
 *   front      "Hold still" — a short burst of frames is captured
 *   turn       animated arrow + head: "slowly turn your head to your left" — a burst is captured
 *   back       "Great, look back at the camera"
 *   checking   frames are sent to the server
 *   passed / failed
 *
 * Capturing bursts (instead of one photo at an exact moment) is what makes
 * this easy: the server keeps the most straight-on frame and the most-turned
 * frame, so a slow or late turn still passes. Frames are only used for this
 * check and are never stored.
 */
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, Glasses, Lightbulb, RotateCcw, ScanFace, ShieldAlert, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { Button, ProgressBar } from './ui';

type Step = 'intro' | 'position' | 'countdown' | 'front' | 'turn' | 'back' | 'checking' | 'passed' | 'failed';

// Timings in milliseconds. Generous on purpose: people need time to read and react.
const COUNTDOWN_SECONDS = 3;
const FRONT_FRAMES = 4; // captured while holding still…
const FRONT_INTERVAL = 300; // …every 0.3 s (≈1.2 s in total)
const TURN_FRAMES = 12; // captured while turning…
const TURN_INTERVAL = 300; // …every 0.3 s (≈3.6 s in total)
const BACK_PAUSE = 900;
const FRAME_WIDTH = 480; // plenty for face analysis, small to upload

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Copy the current video frame into a JPEG image. */
function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const scale = FRAME_WIDTH / video.videoWidth;
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_WIDTH;
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Capture failed'))), 'image/jpeg', 0.85));
}

/** A simple face drawing whose eyes, nose and mouth slide left — it shows the guest how to turn. */
function HeadTurnIcon({ className = 'size-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden>
      <circle cx="32" cy="32" r="24" />
      <g className="animate-head-turn" style={{ transformBox: 'fill-box' }}>
        <circle cx="24" cy="27" r="1.5" fill="currentColor" />
        <circle cx="40" cy="27" r="1.5" fill="currentColor" />
        <path d="M32 30v7l-3 1" />
        <path d="M25 44c4 3 10 3 14 0" />
      </g>
    </svg>
  );
}

type Props = { searchId: string; attemptsLeft: number; onPassed: () => void };

export function LivenessCheck({ searchId, attemptsLeft, onPassed }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false); // set when the guest leaves the page mid-check
  const [step, setStep] = useState<Step>('intro');
  const [countdown, setCountdown] = useState(0);
  const [captured, setCaptured] = useState(0); // frames captured in the current burst (for the progress bar)
  const [message, setMessage] = useState('');
  const [attempts, setAttempts] = useState(attemptsLeft);
  const [cameraReady, setCameraReady] = useState(false); // true once the video shows real frames

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };
  // Turn the camera off when leaving the page. (The flag is reset on mount
  // because React's development mode mounts components twice on purpose.)
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      stopCamera();
    };
  }, []);

  const fail = (text: string) => {
    stopCamera();
    setMessage(text);
    setStep('failed');
  };

  /** Step 1 → 2: switch the camera on and show the oval. Nothing is captured yet. */
  const startCamera = async () => {
    setMessage('');
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false });
    } catch {
      return fail('We need camera access for the check. Please allow the camera in your browser settings and try again.');
    }
    setCameraReady(false);
    setStep('position');
  };

  // Attach the camera stream once the <video> element is on screen.
  useEffect(() => {
    if (step === 'position' && videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play();
    }
  }, [step]);

  /** Capture `count` frames, `interval` ms apart, updating the progress bar. */
  const captureBurst = async (count: number, interval: number) => {
    const frames: Blob[] = [];
    setCaptured(0);
    for (let i = 0; i < count && !cancelledRef.current; i++) {
      frames.push(await captureFrame(videoRef.current!));
      setCaptured(i + 1);
      await wait(interval);
    }
    return frames;
  };

  /** Steps 3–7: countdown → straight burst → turn burst → send. Starts when the guest presses "I'm ready". */
  const runCheck = async () => {
    try {
      await captureAndSend();
    } catch {
      fail('Something went wrong with the camera. Please try again.');
    }
  };

  const captureAndSend = async () => {
    setStep('countdown');
    for (let s = COUNTDOWN_SECONDS; s > 0; s--) {
      setCountdown(s);
      await wait(1000);
    }

    setStep('front');
    const front = await captureBurst(FRONT_FRAMES, FRONT_INTERVAL);

    setStep('turn');
    const turned = await captureBurst(TURN_FRAMES, TURN_INTERVAL);

    setStep('back');
    await wait(BACK_PAUSE);
    if (cancelledRef.current) return;
    stopCamera();
    setStep('checking');

    const form = new FormData();
    front.forEach((frame, i) => form.append('front', frame, `front-${i}.jpg`));
    turned.forEach((frame, i) => form.append('turned', frame, `turned-${i}.jpg`));
    try {
      const result = await api<{ passed: boolean; message?: string }>(`/galleries/${searchId}/liveness`, { method: 'POST', body: form });
      setAttempts((a) => a - 1);
      if (result.passed) {
        setStep('passed');
        setTimeout(onPassed, 1000);
      } else {
        fail(result.message ?? 'The check did not pass. Please try again.');
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === 'LOCKED') setAttempts(0);
      fail(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    }
  };

  const cameraOn = ['position', 'countdown', 'front', 'turn', 'back'].includes(step);
  const burstPercent = step === 'front' ? (captured / FRONT_FRAMES) * 100 : step === 'turn' ? (captured / TURN_FRAMES) * 100 : 0;

  return (
    <div className="mx-auto max-w-md animate-scale-in overflow-hidden rounded-3xl bg-white shadow-pop ring-1 ring-line">
      {/* ---------- top: camera or illustration ---------- */}
      {/* Tall while the camera is on; a short banner otherwise, so instructions fit on a phone screen. */}
      <div className={`relative overflow-hidden bg-stone-900 ${cameraOn ? 'aspect-[4/5]' : 'h-36'}`}>
        {cameraOn ? (
          <>
            {/* Mirrored like a selfie camera, so moving feels natural. */}
            <video
              ref={videoRef}
              playsInline
              muted
              onLoadedData={() => setCameraReady(true)}
              className="size-full -scale-x-100 object-cover"
            />
            {/* Oval guide; it glows green while frames are being captured. */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div
                className={`h-[62%] w-[62%] rounded-[50%] border-4 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] transition-colors ${
                  step === 'front' || step === 'turn' ? 'border-emerald-400' : 'border-white/80'
                }`}
              />
            </div>

            {step === 'countdown' && (
              <div className="absolute inset-0 grid place-items-center">
                <span key={countdown} className="animate-scale-in text-8xl font-black text-white drop-shadow-lg">{countdown}</span>
              </div>
            )}

            {step === 'turn' && (
              <div className="absolute inset-x-0 top-6 flex items-center justify-center gap-3 text-white">
                <ArrowLeft className="size-14 animate-nudge-left drop-shadow-lg" strokeWidth={3} />
                <HeadTurnIcon className="size-14 drop-shadow-lg" />
              </div>
            )}

          </>
        ) : (
          <div className="relative grid size-full place-items-center bg-ink text-white">
            <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
            <div className={`absolute -bottom-16 left-1/2 h-32 w-72 -translate-x-1/2 rounded-full opacity-60 blur-3xl ${step === 'passed' ? 'bg-emerald-500' : step === 'failed' ? 'bg-brand-500' : 'bg-brand-700'}`} />
            <div key={step} className="relative grid size-16 animate-scale-in place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
              {step === 'passed' ? (
                <CheckCircle2 className="size-8 text-emerald-300" />
              ) : step === 'checking' ? (
                <ScanFace className="size-8 animate-pulse" />
              ) : step === 'failed' ? (
                <ShieldAlert className="size-8 text-red-300" />
              ) : (
                <ShieldCheck className="size-8" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ---------- bottom: text and buttons ---------- */}
      <div className="space-y-4 p-6">
        {step === 'intro' && (
          <>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-ink">Quick live face check</h2>
              <p className="mt-1 text-sm text-muted">The organizer protected these photos. It takes about 10 seconds and nothing is saved.</p>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper text-ink ring-1 ring-line"><ScanFace className="size-5" /></span>
                <span><b>Look straight</b> at the camera and hold still for a moment.</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper text-ink ring-1 ring-line"><HeadTurnIcon className="size-6" /></span>
                <span>When the <b>arrow</b> appears, <b>slowly turn your head to your left</b>.</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper text-ink ring-1 ring-line"><CheckCircle2 className="size-5" /></span>
                <span>Look back — your photos open automatically.</span>
              </li>
            </ol>
            <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-xl bg-paper p-3 text-xs text-muted">
              <span className="flex items-center gap-1"><Lightbulb className="size-3.5" />Face a light or window</span>
              <span className="flex items-center gap-1"><Glasses className="size-3.5" />No sunglasses or mask</span>
              <span className="flex items-center gap-1"><ScanFace className="size-3.5" />Only you in view</span>
            </div>
            <Button size="lg" className="w-full" onClick={startCamera}><Camera className="size-5" />Start camera</Button>
          </>
        )}

        {step === 'position' && (
          <>
            <div className="space-y-1 text-center">
              <p className="text-xl font-semibold text-ink">Fit your face inside the oval</p>
              <p className="text-sm text-muted">Make sure it's well lit. Take your time — nothing happens until you press the button.</p>
            </div>
            <Button size="lg" className="w-full" onClick={runCheck} disabled={!cameraReady} loading={!cameraReady}>
              {cameraReady ? "I'm ready" : 'Starting camera…'}
            </Button>
          </>
        )}

        {/* Instructions sit below the camera so they never cover the face. */}
        {['countdown', 'front', 'turn', 'back'].includes(step) && (
          <div className="space-y-3 text-center">
            <p className="text-xl font-semibold text-ink">
              {step === 'countdown' && 'Get ready to look straight at the camera'}
              {step === 'front' && 'Hold still — look straight at the camera'}
              {step === 'turn' && 'Now slowly turn your head to your left'}
              {step === 'back' && 'Great! Look back at the camera'}
            </p>
            <p className="text-sm text-muted">
              {step === 'turn'
                ? "Keep turning until you're looking past the edge of the screen, like glancing over your shoulder."
                : 'Keep your face inside the oval.'}
            </p>
            {(step === 'front' || step === 'turn') && <ProgressBar value={burstPercent} />}
          </div>
        )}

        {step === 'checking' && <p className="flex items-center justify-center gap-2 text-center font-semibold text-ink"><span className="size-4 animate-spin rounded-full border-2 border-brand-100 border-t-brand-600" />Checking… this takes a few seconds.</p>}
        {step === 'passed' && <p className="text-center font-semibold text-emerald-700">Verified! Opening your photos…</p>}

        {step === 'failed' && (
          <div className="space-y-4 text-center">
            <p className="rounded-xl bg-tag-red/70 p-3 text-sm font-medium text-tag-red-text ring-1 ring-tag-red ring-inset">{message}</p>
            {attempts > 0 ? (
              <>
                <Button size="lg" className="w-full" onClick={startCamera}><RotateCcw className="size-5" />Try again</Button>
                <p className="text-xs text-muted">{attempts} attempt{attempts === 1 ? '' : 's'} left</p>
              </>
            ) : (
              <p className="text-sm text-muted">No attempts left. Send a new selfie to the bot to get a fresh gallery link.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
