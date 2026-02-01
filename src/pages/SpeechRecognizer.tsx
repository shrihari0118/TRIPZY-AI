import React, { useState, useRef } from "react";

const SpeechRecognizer: React.FC = () => {
  const [text, setText] = useState<string>("");
  const [listening, setListening] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser.");
      return;
    }

    if (recognitionRef.current && listening) {
    recognitionRef.current.stop();
    return;
  }

    const recognition = new SpeechRecognition();

    recognition.lang = "en"; // flexible detection
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>🎤 Speech Translator</h2>

      <button onClick={startListening}>
        {listening ? "Listening..." : "Start Speaking"}
      </button>

      <p>Recognized Text:</p>
      <h3>{text}</h3>
    </div>
  );
};

export default SpeechRecognizer;
