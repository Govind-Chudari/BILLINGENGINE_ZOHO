import { useState } from "react";
import { aiAPI } from "../services/api";
import { MessageSquare, X, Send, Bot, User } from "lucide-react";

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "ai", content: "Hi! I'm your billing assistant. Ask me anything about your usage or bills." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await aiAPI.chat(userMsg);
      setMessages(prev => [...prev, { role: "ai", content: res.data.answer }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I ran into an error processing that." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-all z-40 ${isOpen ? 'scale-0' : 'scale-100'}`}
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 flex flex-col h-[500px] max-h-[80vh]">
          {/* Header */}
          <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <h3 className="font-bold">Billing AI</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-indigo-100 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-indigo-100 text-indigo-600" : "bg-white border border-gray-200 text-gray-600"}`}>
                  {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`px-3 py-2 rounded-xl text-sm max-w-[75%] ${msg.role === "user" ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white border border-gray-200 text-gray-700 rounded-tl-none"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-600 flex items-center justify-center">
                  <Bot size={14} />
                </div>
                <div className="px-3 py-2 rounded-xl bg-white border border-gray-200 rounded-tl-none flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            )}
          </div>

          {/* Suggested Quick Prompts */}
          {messages.length === 1 && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-1.5 shrink-0">
              {[
                "Negotiate my current bill",
                "Analyze my storage usage",
                "Do I have any anomalies?"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200 shrink-0">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about your bill..."
                className="w-full bg-gray-100 border-transparent focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl pl-4 pr-10 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
