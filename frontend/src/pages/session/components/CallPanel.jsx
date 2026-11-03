import {
  MessageCircle,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  RotateCw,
  Video,
  VideoOff,
} from "lucide-react";
import { StreamVideo } from "./StreamMedia.jsx";

const Tile = ({ person, isMe, stream, cameraOn, micOn }) => (
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/8 bg-linear-to-br from-recessed to-card">
    <div className="relative min-h-0 flex-1">
      {stream && cameraOn ? (
        <StreamVideo
          stream={stream}
          className={`absolute inset-0 size-full object-cover ${isMe ? "-scale-x-100" : ""}`}
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-16 place-items-center rounded-full bg-primary-start/20 text-2xl font-semibold uppercase text-primary-start">
            {person?.username?.[0] ?? "?"}
          </span>
        </span>
      )}
    </div>

    <div className="flex h-10 shrink-0 items-center gap-2 border-t border-white/8 px-3">
      <span
        className={`size-1.5 shrink-0 rounded-full ${person?.connected ? "bg-emerald-400" : "bg-red-400"}`}
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
        {person ? person.username : "Partner"}
        {isMe && <span className="text-white/40"> (you)</span>}
        {person?.role === "host" && <span className="text-white/40"> · Host</span>}
      </span>
      {micOn ? (
        <Mic className="size-4 shrink-0 text-emerald-400" />
      ) : (
        <MicOff className="size-4 shrink-0 text-white/35" />
      )}
    </div>
  </div>
);

const ControlButton = ({ label, active, danger, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-pressed={Boolean(active)}
    title={label}
    className={`grid size-10 place-items-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 ${
      danger
        ? "border-red-400/20 bg-red-400/5 text-red-400 hover:bg-red-400/10"
        : active
          ? "border-primary-start/40 bg-primary-start/15 text-primary-start"
          : "border-white/8 bg-recessed text-white/60 hover:text-white"
    }`}
  >
    {children}
  </button>
);

const statusOf = (partner, connection) => {
  if (!partner?.connected) return { text: "Waiting for your partner", dot: "bg-white/30" };
  if (connection === "connected") return { text: "Call connected", dot: "bg-emerald-400" };
  if (connection === "failed") return { text: "Could not connect", dot: "bg-red-400" };
  return { text: "Connecting...", dot: "animate-pulse bg-amber-400" };
};

const CallPanel = ({ people, me, call, unread, onOpenChat }) => {
  const mine = people.find((p) => p.username === me);
  const partner = people.find((p) => p.username !== me);
  const status = statusOf(partner, call.connection);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/8 bg-card">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/8 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          <Video className="size-4 text-primary-start" /> Video call
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-white/45">
          <span className={`size-1.5 rounded-full ${status.dot}`} />
          {status.text}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3">
        <Tile
          person={mine}
          isMe
          stream={call.localCamera}
          cameraOn={call.local.camera}
          micOn={call.local.audio}
        />
        <Tile
          person={partner}
          stream={call.remote.camera}
          cameraOn={call.peer.video}
          micOn={call.peer.audio}
        />
      </div>

      <div className="shrink-0 border-t border-white/8 p-3">
        {call.local.screen && (
          <p className="mb-2.5 text-center text-xs text-primary-start">Your partner can see your screen.</p>
        )}
        {call.error && <p className="mb-2.5 text-center text-xs text-red-400">{call.error}</p>}
        {!call.supported && (
          <p className="mb-2.5 text-center text-xs text-white/40">
            Video calls need a secure (https) page and a recent browser.
          </p>
        )}

        <div className="flex items-center justify-center gap-2">
          {call.supported && (
            <>
              <ControlButton
                label={call.local.audio ? "Mute microphone" : "Turn on microphone"}
                active={call.local.audio}
                onClick={() => call.toggle("audio")}
              >
                {call.local.audio ? <Mic className="size-[18px]" /> : <MicOff className="size-[18px]" />}
              </ControlButton>

              <ControlButton
                label={call.local.camera ? "Turn off camera" : "Turn on camera"}
                active={call.local.camera}
                onClick={() => call.toggle("camera")}
              >
                {call.local.camera ? <Video className="size-[18px]" /> : <VideoOff className="size-[18px]" />}
              </ControlButton>

              {call.screenSupported && (
                <ControlButton
                  label={call.local.screen ? "Stop sharing your screen" : "Share your screen"}
                  active={call.local.screen}
                  danger={call.local.screen}
                  onClick={() => call.toggle("screen")}
                >
                  {call.local.screen ? (
                    <MonitorOff className="size-[18px]" />
                  ) : (
                    <MonitorUp className="size-[18px]" />
                  )}
                </ControlButton>
              )}

              {call.connection === "failed" && (
                <ControlButton label="Reconnect the call" onClick={call.reconnect}>
                  <RotateCw className="size-[18px]" />
                </ControlButton>
              )}
            </>
          )}

          <button
            type="button"
            onClick={onOpenChat}
            className="relative flex h-10 items-center gap-2 rounded-xl border border-white/8 bg-recessed px-3.5 text-sm font-medium text-white/70 transition-all duration-200 hover:-translate-y-0.5 hover:text-white"
          >
            <MessageCircle className="size-[18px]" /> Chat
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-linear-to-r from-primary-start to-primary-end px-1 text-[11px] font-semibold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallPanel;