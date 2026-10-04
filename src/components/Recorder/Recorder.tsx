import { useRef, useState } from "react";
import { AudioRecorder } from "../../audio/recorder";
import "./Recorder.css";

import { decodeAudioBlob } from "../../audio/decode";
import { toMono, resampleLinear } from "../../audio/resample";
import { normalizeAudio } from "../../audio/normalize";

export default function Recorder() {
  const recorderRef = useRef<AudioRecorder | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStartRecording() {
    try {
      setError(null);

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      const recorder = new AudioRecorder();
      recorderRef.current = recorder;

      await recorder.start();

      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError("Could not access the microphone.");
    }
  }

  async function handleStopRecording() {
    try {
      if (!recorderRef.current) {
        return;
      }

      const blob = await recorderRef.current.stop();
      const audioBuffer = await decodeAudioBlob(blob);

    	const mono = toMono(audioBuffer);

      const resampled = resampleLinear(
			mono,
			audioBuffer.sampleRate,
			16000,
			);

			const normalized = normalizeAudio(resampled);

			console.log({
			originalSampleRate: audioBuffer.sampleRate,
			targetSampleRate: 16000,
			samples: normalized.length,
			durationSeconds: normalized.length / 16000,
			firstSamples: Array.from(normalized.slice(0, 10)),
			});
      const url = URL.createObjectURL(blob);

      setAudioUrl(url);
      setIsRecording(false);
    } catch (err) {
      console.error(err);
      setError("Could not stop the recording.");
    }
  }

  return (
    <div className="recorder">
      <h1>Pronunciation Trainer</h1>

      <p className="target-word">three</p>

      {!isRecording ? (
        <button onClick={handleStartRecording}>Start recording</button>
      ) : (
        <button onClick={handleStopRecording}>Stop recording</button>
      )}

      {isRecording && <p>Recording...</p>}

      {audioUrl && (
        <div className="playback">
          <p>Your recording</p>
          <audio controls src={audioUrl} />
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}