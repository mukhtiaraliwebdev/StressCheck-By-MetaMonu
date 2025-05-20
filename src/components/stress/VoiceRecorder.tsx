
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, StopCircle, AlertTriangle, UploadCloud, BarChart2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface VoiceRecorderProps {
  onRecordingComplete: (base64Data: string, mimeType: string) => void;
  isAnalyzing: boolean;
  disabled?: boolean; // Added disabled prop
}

const MAX_RECORDING_DURATION_SECONDS = 60;

export function VoiceRecorder({ onRecordingComplete, isAnalyzing, disabled = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderMimeTypeRef = useRef<string>("audio/webm"); 

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const visualizerFrameIdRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stopStreamAndVisualizer = useCallback(() => {
    if (visualizerFrameIdRef.current) {
      cancelAnimationFrame(visualizerFrameIdRef.current);
      visualizerFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
       // audioContextRef.current.close(); // Avoid closing if it might be reused or handled by effect
       // audioContextRef.current = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      stopStreamAndVisualizer();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.error("Error closing AudioContext on unmount:", e));
      }
    };
  }, [stopStreamAndVisualizer]);

  const drawVisualizer = useCallback(() => {
    if (!isRecording || !analyserRef.current || !canvasRef.current || !audioContextRef.current || audioContextRef.current.state !== 'running') {
      if (visualizerFrameIdRef.current) cancelAnimationFrame(visualizerFrameIdRef.current);
      visualizerFrameIdRef.current = null;
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'hsl(var(--card))';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'hsl(var(--primary))';
    ctx.beginPath();

    const sliceWidth = canvas.width * 1.0 / analyserRef.current.frequencyBinCount;
    let x = 0;

    for (let i = 0; i < analyserRef.current.frequencyBinCount; i++) {
      const v = dataArray[i] / 128.0; 
      const y = v * canvas.height / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    visualizerFrameIdRef.current = requestAnimationFrame(drawVisualizer);
  }, [isRecording]);


  const startRecording = async () => {
    if (disabled) return;
    setError(null);
    setRecordingTime(0);
    audioChunksRef.current = [];

    if (typeof window === "undefined") {
        setError("Audio recording is not supported in this environment.");
        return;
    }
    
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setError(null);

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(streamRef.current);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      sourceNodeRef.current.connect(analyserRef.current);

      const mimeTypes = [
        'audio/webm; codecs=opus',
        'audio/ogg; codecs=opus',
        'audio/webm',
        'audio/mp4', // For Safari
        'audio/wav'
      ];
      let supportedMimeType = "";
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          supportedMimeType = type;
          break;
        }
      }
      if (!supportedMimeType) {
         console.warn("[VoiceRecorder] No preferred MIME types supported. Using browser default.");
      }
      recorderMimeTypeRef.current = supportedMimeType || ""; // Fallback to let browser decide if truly none specific supported
      
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType: recorderMimeTypeRef.current || undefined });
      if (!recorderMimeTypeRef.current && mediaRecorderRef.current.mimeType) {
         recorderMimeTypeRef.current = mediaRecorderRef.current.mimeType;
      }
      console.log(`[VoiceRecorder] MediaRecorder initialized. Actual MIME type: ${mediaRecorderRef.current.mimeType}`);
      recorderMimeTypeRef.current = mediaRecorderRef.current.mimeType; // Ensure this is set to what MediaRecorder is using
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const capturedAudioChunks = [...audioChunksRef.current];
        audioChunksRef.current = []; // Clear for next recording

        if (visualizerFrameIdRef.current) {
          cancelAnimationFrame(visualizerFrameIdRef.current);
          visualizerFrameIdRef.current = null;
        }

        if (capturedAudioChunks.length === 0) {
          setError("Recording produced no audio data. Please check microphone and permissions, then try again.");
          stopStreamAndVisualizer();
          return;
        }
        
        const audioBlob = new Blob(capturedAudioChunks, { type: recorderMimeTypeRef.current });
        if (audioBlob.size === 0) {
           setError("Captured audio data is empty after blob creation.");
           stopStreamAndVisualizer();
           return;
        }

        blobToBase64(audioBlob)
          .then(dataUri => { 
            const parts = dataUri.split(',');
            if (parts.length < 2 || !parts[0].includes('base64') || parts[1] === '') {
                setError("Failed to process recorded audio: malformed data URI.");
                console.error("[VoiceRecorder] Malformed data URI from FileReader", dataUri.substring(0,100));
                stopStreamAndVisualizer(); 
                return; 
            }
            const mimeTypeForApi = parts[0].substring(parts[0].indexOf(':') + 1, parts[0].indexOf(';'));
            const actualBase64Data = parts[1]; 

            onRecordingComplete(actualBase64Data, mimeTypeForApi);
            stopStreamAndVisualizer(); // Clean up after successful processing
          })
          .catch(e => {
            console.error("[VoiceRecorder] Error processing audio to Base64:", e);
            setError("Failed to process recorded audio data.");
            stopStreamAndVisualizer(); 
          });
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      if (visualizerFrameIdRef.current) cancelAnimationFrame(visualizerFrameIdRef.current);
      drawVisualizer(); 

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
            const newTime = prev + 1;
            if (newTime >= MAX_RECORDING_DURATION_SECONDS) {
                stopRecording();
            }
            return newTime;
        });
      }, 1000);

    } catch (err: any) {
      console.error("[VoiceRecorder] Error accessing microphone or starting recording:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Microphone access denied. Please enable microphone access in your browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError("No microphone found. Please ensure a microphone is connected and enabled.");
      } else {
        setError(`Could not access microphone: ${err.message || "Unknown error"}. Ensure it's available and not in use.`);
      }
      stopStreamAndVisualizer();
    }
  };

  const stopRecording = () => {
    setIsRecording(false); 
    if (timerRef.current) clearInterval(timerRef.current);
    // setRecordingTime(0); // Keep time until new recording starts for display

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop(); 
    } else {
      // If not recording (e.g. error before start), ensure cleanup
      stopStreamAndVisualizer();
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error("FileReader did not return a string."));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="text-primary" />
          Voice Stress Analyzer
        </CardTitle>
        <CardDescription>Record your voice to analyze stress levels. Max {MAX_RECORDING_DURATION_SECONDS}s.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-destructive/20 text-destructive rounded-md flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="w-full h-[100px] bg-muted/50 rounded-md overflow-hidden relative border border-border">
            <canvas ref={canvasRef} width="300" height="100" className="w-full h-full block"></canvas>
            {(!isRecording && !isAnalyzing && !error && (!visualizerFrameIdRef.current || recordingTime === 0)) && ( 
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
                    <BarChart2 className="h-10 w-10" />
                    <p className="ml-2 mt-1 text-sm">Voice activity will appear here</p>
                </div>
            )}
        </div>

        <div className="flex flex-col items-center space-y-2">
          {isRecording ? (
            <Button onClick={stopRecording} variant="destructive" size="lg" className="w-full" disabled={isAnalyzing}>
              <StopCircle className="mr-2 h-5 w-5" />
              Stop Recording ({formatTime(recordingTime)} / {MAX_RECORDING_DURATION_SECONDS}s)
            </Button>
          ) : (
            <Button onClick={startRecording} size="lg" className="w-full" disabled={isAnalyzing || disabled}>
              <Mic className="mr-2 h-5 w-5" />
              {error ? "Try Recording Again" : "Start Recording"}
            </Button>
          )}
          {isRecording && <Progress value={(recordingTime / MAX_RECORDING_DURATION_SECONDS) * 100} className="w-full h-2 mt-2" />}
        </div>
         {isAnalyzing && (
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <UploadCloud className="h-5 w-5 animate-pulse" />
            <span>Analyzing your voice...</span>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Your recordings are processed securely. Ensure you are in a quiet environment for best results.
        </p>
      </CardFooter>
    </Card>
  );
}
