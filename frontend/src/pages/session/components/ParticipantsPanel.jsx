import { Users } from "lucide-react";

const Tile = ({ person, isMe }) => (
  <div className="flex h-24 items-center gap-3.5 rounded-xl border border-white/8 bg-linear-to-br from-recessed to-card px-4">
    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-start/20 text-base font-semibold uppercase text-primary-start">
      {person.username[0]}
    </span>

    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-white">
        {person.username}
        {isMe && <span className="text-white/40"> (you)</span>}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/45">
        <span className={`size-1.5 rounded-full ${person.connected ? "bg-emerald-400" : "bg-red-400"}`} />
        {person.connected ? "Connected" : "Disconnected"}
        {person.role === "host" && " · Host"}
      </p>
    </div>
  </div>
);

const ParticipantsPanel = ({ people, me }) => (
  <div className="shrink-0 rounded-2xl border border-white/8 bg-card p-2.5">
    <p className="flex items-center gap-2 px-1.5 pb-2 pt-0.5 text-xs font-medium text-white/55">
      <Users className="size-3.5 text-primary-start" /> In this room
    </p>

    <div className="space-y-2">
      {people.map((p) => (
        <Tile key={p.username} person={p} isMe={p.username === me} />
      ))}
    </div>
  </div>
);

export default ParticipantsPanel;