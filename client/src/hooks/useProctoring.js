import { useEffect, useRef } from 'react';
import { responsesAPI } from '../services/api';

export default function useProctoring({ enabled, responseId, type = 'screen', chunkMs = 15000 }) {
  const stopRef = useRef(false);

  useEffect(() => {
    if (!enabled || !responseId) return undefined;
    stopRef.current = false;
    let mediaStream = null;
    let mediaRecorder = null;
    let chunks = [];
    const timers = new Set();
    const schedule = (callback, delay) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        callback();
      }, delay);
      timers.add(timer);
    };

    const startOnce = async () => {
      try {
        if (type === 'screen') {
          mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        } else {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size) chunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          if (!chunks.length) return;
          const blob = new Blob(chunks, { type: 'video/webm' });
          chunks = [];
          try {
            const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'video/webm' });
            await responsesAPI.proctoringUpload(responseId, file, true);
          } catch (err) {
            console.error('Proctoring upload failed', err);
          }

          if (!stopRef.current) {
            // start next chunk
            schedule(() => {
              try {
                if (mediaRecorder && mediaRecorder.state === 'inactive') mediaRecorder.start();
                schedule(() => {
                  if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
                }, chunkMs);
              } catch (err) {
                console.error('Restart recording failed', err);
              }
            }, 500);
          }
        };

        mediaRecorder.start();
        schedule(() => {
          if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
        }, chunkMs);
      } catch (err) {
        console.error('Proctoring start failed', err);
      }
    };

    startOnce();

    return () => {
      stopRef.current = true;
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      try {
        if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
      } catch {}
      try {
        if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, responseId, type, chunkMs]);
}
