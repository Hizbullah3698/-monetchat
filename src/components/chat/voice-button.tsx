"use client";

import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";

const MAX_RECORDING_SECONDS = 60;

interface VoiceButtonProps {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
}

export function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const { t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= MAX_RECORDING_SECONDS - 1) {
            // Auto-stop at max duration
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) return; // Too short

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");

          const res = await fetch("/api/chat/voice", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.transcript) {
              onTranscript(data.transcript);
            }
          }
        } catch (err) {
          console.error("Voice transcription error:", err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setIsRecording(true);
    } catch {
      console.error("Microphone access denied");
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // When recording, show inline progress bar
  if (isRecording) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500 text-white text-sm font-medium shrink-0 transition-all hover:bg-red-600"
      >
        <Square className="h-3 w-3 fill-current" />
        <div className="flex items-center gap-2">
          {/* Animated progress bar */}
          <div className="w-16 h-1.5 bg-red-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${(recordingSeconds / MAX_RECORDING_SECONDS) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs tabular-nums">{formatTime(recordingSeconds)}</span>
        </div>
        {/* Pulsing dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="shrink-0"
      onClick={handleClick}
      disabled={disabled || isTranscribing}
      title={t("chat.voiceSearch")}
    >
      {isTranscribing ? (
        <Mic className="h-5 w-5 animate-pulse text-primary" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </Button>
  );
}
