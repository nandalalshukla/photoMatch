/**
 * Live face check (shown before a protected gallery opens).
 *
 * Steps for the guest:
 *   1. Allow the camera.
 *   2. Look straight at the camera  → we capture frame #1 after a short countdown.
 *   3. Turn your head to one side   → we capture frame #2.
 * Both frames are sent to the API, which asks the AI service whether this is a
 * real person (not a photo/screen) and whether it matches the selfie.
 * Frames are only used for this check and are never stored.
 */
import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, RotateCcw, ScanFace, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { Button } from './ui';

type Step = 'intro' | 'front' | 'turned' | 'checking' | 'failed' | 'passed';

const COUNTDOWN_SECONDS = 3;
const FRAME_WIDTH = 640; // plenty for face analysis, small to upload

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Copy the current video frame into a JPEG image. */
function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const scale = FRAME_WIDTH / video.videoWidth;
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_WIDTH;
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Capture failed'))), 'image/jpeg', 0.92));
}

type Props = { searchId: string; attemptsLeft: number; onPassed: () => void };

export function LivenessCheck({ searchId, attemptsLeft, onPassed }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<Step>('intro');
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState('');
  const [attempts, setAttempts] = useState(attemptsLeft);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };
  useEffect(() => stopCamera, []); // turn the camera off when leaving the page

  const countDown = async () => {
    for (let s = COUNTDOWN_SECONDS; s > 0; s--) {
      setCountdown(s);
      await wait(1000);
    }
    setCountdown(0);
  };

  const run = async () => {
    setMessage('');
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false });
    } catch {
      setMessage('We need camera access for the check. Please allow it in your browser settings and try again.');
      setStep('failed');
      return;
    }

    setStep('front');
    await wait(50); // let React render the <video> element
    const video = videoRef.current!;
    video.srcObject = streamRef.current;
    await video.play();

    await countDown();
    const front = await captureFrame(video);

    setStep('turned');
    await countDown();
    const turned = await captureFrame(video);

    stopCamera();
    setStep('checking');

    const form = new FormData();
    form.append('front', front, 'front.jpg');
    form.append('turned', turned, 'turned.jpg');
    try {
      const result = await api<{ passed: boolean; message?: string }>(`/galleries/${searchId}/liveness`, { method: 'POST', body: form });
      setAttempts((a) => a - 1);
      if (result.passed) {
        setStep('passed');
        setTimeout(onPassed, 900);
      } else {
        setMessage(result.message ?? 'The check did not pass. Please try again.');
        setStep('failed');
      }
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
      if (error instanceof ApiError && error.code === 'LOCKED') setAttempts(0);
      setStep('failed');
    }
  };

  const filming = step === 'front' || step === 'turned';

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-3xl bg-white shadow-xl shadow-brand-900/5 ring-1 ring-slate-200">
      <div className="relative aspect-[4/5] bg-slate-900">
        {filming ? (
          <>
            {/* Mirrored like a selfie camera, so moving feels natural. */}
            <video ref={videoRef} playsInline muted className="size-full -scale-x-100 object-cover" />
            {/* Oval guide */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="h-[62%] w-[62%] rounded-[50%] border-4 border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]" />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 text-center text-white">
              <p className="text-lg font-semibold">{step === 'front' ? 'Look straight at the camera' : 'Now slowly turn your head to the side'}</p>
              {countdown > 0 && <p className="mt-1 text-4xl font-bold">{countdown}</p>}
            </div>
          </>
        ) : (
          <div className="grid size-full place-items-center brand-gradient text-white">
            {step === 'passed' ? <CheckCircle2 className="size-20" /> : step === 'checking' ? <ScanFace className="size-20 animate-pulse" /> : <ShieldCheck className="size-20" />}
          </div>
        )}
      </div>

      <div className="space-y-4 p-6 text-center">
        {step === 'intro' && (
          <>
            <h2 className="text-xl font-bold">Quick live face check</h2>
            <p className="text-sm text-slate-600">The organizer protected these photos. Show us it's really you: look at the camera, then turn your head. It takes 6 seconds and nothing is saved.</p>
            <Button size="lg" className="w-full" onClick={run}><Camera className="size-5" />Start camera</Button>
          </>
        )}
        {filming && <p className="text-sm text-slate-500">Keep your face inside the oval, in good light.</p>}
        {step === 'checking' && <p className="font-semibold">Checking… this takes a few seconds.</p>}
        {step === 'passed' && <p className="font-semibold text-emerald-700">Verified! Opening your photos…</p>}
        {step === 'failed' && (
          <>
            <p className="text-sm font-medium text-red-700">{message}</p>
            {attempts > 0 ? (
              <>
                <Button size="lg" className="w-full" onClick={run}><RotateCcw className="size-5" />Try again</Button>
                <p className="text-xs text-slate-500">{attempts} attempt{attempts === 1 ? '' : 's'} left</p>
              </>
            ) : (
              <p className="text-sm text-slate-600">No attempts left. Send a new selfie to the bot to get a fresh gallery link.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
