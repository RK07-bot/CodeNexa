import { Laptop } from "lucide-react";
import { SessionCard } from "./SessionShell.jsx";

const TakenOver = ({ onUseHere }) => (
  <SessionCard>
    <div className="grid size-12 place-items-center rounded-xl bg-amber-400/10 text-amber-400">
      <Laptop className="size-6" />
    </div>

    <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">
      This room is open somewhere else
    </h1>
    <p className="mt-2 text-sm leading-6 text-white/45">
      You joined from another tab or device, so this one has been disconnected. Only one place
      can be in the room at a time.
    </p>

    <button
      type="button"
      onClick={onUseHere}
      className="mt-6 w-full rounded-xl bg-linear-to-r from-primary-start to-primary-end py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5"
    >
      Use this tab instead
    </button>
  </SessionCard>
);

export default TakenOver;