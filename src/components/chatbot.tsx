import { useState } from "react";

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi 👋 Where do you want to travel?" }
  ]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages([...messages, { sender: "user", text: input }]);
    setInput("");

    setTimeout(() => {
      setMessages(m => [
        ...m,
        { sender: "bot", text: "Nice 😎 Tell me your budget and dates" }
      ]);
    }, 700);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg z-50"
      >
        ✈️
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 w-80 h-[420px] bg-white rounded-xl shadow-2xl flex flex-col z-50">
          <div className="bg-blue-600 text-white p-3 font-semibold flex justify-between">
            Trip Planner AI
            <button onClick={() => setOpen(false)}>✖</button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto bg-gray-100">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`mb-2 p-2 rounded-lg max-w-[80%] ${
                  m.sender === "user"
                    ? "bg-blue-600 text-white ml-auto"
                    : "bg-gray-300"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="p-2 flex gap-2 border-t">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              className="flex-1 border rounded px-2"
              placeholder="Ask about trips..."
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white px-3 rounded"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
