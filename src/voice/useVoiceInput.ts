import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { SPEECH_OPTIONS } from "./speechConfig";

export function useVoiceInput() {
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition, isMicrophoneAvailable } =
    useSpeechRecognition();

  async function start() {
    await SpeechRecognition.startListening(SPEECH_OPTIONS);
  }

  function stop() {
    SpeechRecognition.stopListening();
  }

  return {
    transcript,
    listening,
    resetTranscript,
    start,
    stop,
    supported: browserSupportsSpeechRecognition,
    microphoneAvailable: isMicrophoneAvailable,
  };
}
