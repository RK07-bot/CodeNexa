import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { useSocket } from "../../../context/SocketContext.jsx";

const clock = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const ChatPanel = ({ messages, me }) => {
  const { socket, connected } = useSocket();

  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const listRef = useRef(null);
  const atBottom = useRef(true);

  // new messages scroll into view only if the reader is already at the bottom
  const handleScroll = () => {
    const el = listRef.current;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  useEffect(() => {
    const el = listRef.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();

    const value = text.trim();
    if (!value || sending || !socket) return;

    setSending(true);
    setError("");

    socket.timeout(5000).emit("chat:send", { text: value }, (err, ack) => {
      setSending(false);

      if (err || !ack?.ok) {
        setError(err ? "No response from the server." : ack.message);
        return;
      }

      // the message itself comes back through chat:message like it does for the partner
      setText("");
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/8 bg-card">
      <p className="flex shrink-0 items-center gap-2 border-b border-white/8 px-4 py-2.5 text-xs font-medium text-white/55">
        <MessageCircle className="size-3.5 text-primary-start" /> Chat
      </p>

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain p-3"
        style={{ scrollbarWidth: "thin", scrollbarColor: "var(--color-primary-start) var(--color-recessed)" }}
      >
        {messages.length === 0 && (
          <p className="grid h-full place-items-center px-4 text-center text-xs leading-5 text-white/35">
            No messages yet. Say hello to your partner.
          </p>
        )}

        {messages.map((m) => {
          const mine = m.username === me;

          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {!mine && <span className="mb-0.5 text-[11px] text-white/40">{m.username}</span>}
              <p
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm ${
                  mine ? "bg-primary-start/20 text-white" : "bg-recessed text-white/85"
                }`}
              >
                {m.text}
              </p>
              <span className="mt-0.5 text-[10px] text-white/25">{clock(m.at)}</span>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="shrink-0 border-t border-white/8 p-2.5">
        {error && <p className="mb-2 px-1 text-xs text-red-400">{error}</p>}

        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError("");
            }}
            maxLength={500}
            disabled={!connected}
            placeholder={connected ? "Message your partner" : "Reconnecting..."}
            className="min-w-0 flex-1 rounded-xl border border-white/8 bg-recessed px-3 py-2 text-sm text-white outline-none transition-all duration-200 placeholder:text-white/25 focus:border-primary-start/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!connected || sending || !text.trim()}
            aria-label="Send message"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-linear-to-r from-primary-start to-primary-end text-white transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <Send className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;