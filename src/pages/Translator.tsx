import { useState, useRef } from "react";
import { Mic, Volume2, RefreshCw } from 'lucide-react';

export default function Translator() {
const [text, setText] = useState<string>("");
const [listening, setListening] = useState<boolean>(false);
const [speechLanguage, setSpeechLanguage] = useState("en-US");
const [translatedText, setTranslatedText] = useState("");
const [targetLanguage, setTargetLanguage] = useState("en");
const [isSpeaking, setIsSpeaking] = useState(false);


const speakText = (text: string) => {

  if (!window.speechSynthesis) {
    alert("Text-to-Speech not supported in this browser.");
    return;
  }
    window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = targetLanguage; 
  utterance.onstart = () => setIsSpeaking(true);
  utterance.onend = () => setIsSpeaking(false);
  // automatically matches translation language
  window.speechSynthesis.speak(utterance);
};


const translateText = async (speechText: string) => {
  try {
    const response = await fetch("http://127.0.0.1:8000/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: speechText,
        target_language: targetLanguage,
      }),
    });

    const data = await response.json();
    setTranslatedText(data.translated_text);
    speakText(data.translated_text);

  } catch (error) {
    console.error("Translation error:", error);
  }
};



const recognitionRef = useRef<any>(null);

const startListening = () => {

  // ✅ If already listening → stop manually
  if (recognitionRef.current && listening) {
    recognitionRef.current.stop();
    return;
  }

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech Recognition is not supported in this browser. Please use Google Chrome.");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = speechLanguage;
  recognition.continuous = false;
  recognition.interimResults = false;

  // ✅ Mic turned ON
  recognition.onstart = () => {
    setListening(true);
    setText("");
    setTranslatedText("");
  };

  //  Browser stopped listening (auto OR manual)
  recognition.onend = () => {
    setListening(false);
  };

  //  Speech captured
  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    setText(transcript);
    translateText(transcript);

    // Stop immediately after capturing speech
    recognition.stop();
  };

  recognitionRef.current = recognition;
  recognition.start();
};


  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Speech Translator
        </h1>
        <p className="text-gray-600">
          Translate your speech in real-time to communicate effortlessly
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-8 mb-6">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-gray-700">
                Source Language
              </label>
              <select
  value={speechLanguage}
  onChange={(e) => setSpeechLanguage(e.target.value)}
  className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
>
  <option value="en-US">English</option>
  <option value="hi-IN">Hindi</option>
  <option value="ta-IN">Tamil</option>
  <option value="te-IN">Telugu</option>
  <option value="kn-IN">Kannada</option>
  <option value="ml-IN">Malayalam</option>
  <option value="ja-JP">Japanese</option>
  <option value="ko-KR">Korean</option>
  <option value="es-ES">Spanish</option>
  <option value="fr-FR">French</option>
</select>


            </div>

            <div className="bg-gray-50 rounded-lg p-6 min-h-[200px] mb-4 border-2 border-dashed border-gray-300">
  {text ? (
    <p className="text-gray-800 font-medium">{text}</p>
  ) : (
    <p className="text-gray-400 italic">
      Your speech will appear here...
    </p>
  )}
</div>


            <div className="flex justify-center">
              <button
  onClick={startListening}
  className={`flex items-center gap-2 text-white rounded-full px-6 py-4 shadow-lg transition ${
    listening
      ? "bg-red-600 hover:bg-red-700"
      : "bg-blue-600 hover:bg-blue-700"
  }`}
>
  <Mic className="w-6 h-6" />
  <span className="font-medium">
    {listening ? "Stop Listening" : "Start Speaking"}
  </span>
</button>



            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-gray-700">
                Target Language
              </label>
              <select
  value={targetLanguage}
  onChange={(e) => setTargetLanguage(e.target.value)}
  className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <option value="en">English</option>
  <option value="hi">Hindi</option>
  <option value="ta">Tamil</option>
  <option value="te">Telugu</option>
  <option value="kn">Kannada</option>
  <option value="ml">Malayalam</option>
  <option value="ja">Japanese</option>
  <option value="ko">Korean</option>
  <option value="es">Spanish</option>
  <option value="fr">French</option>
</select>

            </div>

            <div className="bg-blue-50 rounded-lg p-6 min-h-[200px]">
  {translatedText ? (
  <p className="text-gray-800 font-medium">
    {translatedText}
  </p>
) : listening ? (
  <p className="text-blue-500 italic">
    Listening...
  </p>
) : text ? (
  <p className="text-blue-500 italic">
    Translating...
  </p>
) : (
  <p className="text-gray-400 italic">
    Translation will appear here...
  </p>
)}
</div>


            <div className="flex items-center justify-between">
              <button disabled={!translatedText} onClick={() => speakText(translatedText)} className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Volume2 className="w-5 h-5" />
                <span className="text-sm font-medium">Play Audio</span>
              </button>
              <div className="text-sm text-gray-500">
                Response time: <span className="font-semibold text-blue-600">0.0s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Mic className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">High Accuracy</div>
              <div className="text-xs text-gray-500">99% accuracy rate</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <RefreshCw className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Real-Time</div>
              <div className="text-xs text-gray-500">Instant translation</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Volume2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Natural Voice</div>
              <div className="text-xs text-gray-500">Human-like audio</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}