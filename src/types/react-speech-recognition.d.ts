declare module "react-speech-recognition" {
  type StartListeningOptions = {
    continuous?: boolean;
    language?: string;
  };

  const SpeechRecognition: {
    startListening(options?: StartListeningOptions): Promise<void>;
    stopListening(): void;
  };

  export function useSpeechRecognition(): {
    transcript: string;
    listening: boolean;
    resetTranscript(): void;
    browserSupportsSpeechRecognition: boolean;
    isMicrophoneAvailable: boolean;
  };

  export default SpeechRecognition;
}
