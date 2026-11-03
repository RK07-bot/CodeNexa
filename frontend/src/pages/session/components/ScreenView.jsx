import { useEffect } from "react";
import { Maximize2, Minimize2, MonitorUp } from "lucide-react";
import { StreamVideo } from "./StreamMedia.jsx";

// The partner's shared screen. Small, it sits in the left panel next to the editor.
// Enlarged, it covers the problem and editor area, and the video call stays visible on the right.
const ScreenView = ({ stream, name, expanded = false, onToggle }) => {
  useEffect(() => {
    if (!expanded) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape") onToggle?.();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, onToggle]);

  return (
    <div
      className={
        expanded
          ? "relative size-full overflow-hidden rounded-2xl border border-white/8 bg-editor"
          : "absolute inset-0 bg-editor"
      }
    >
      <StreamVideo stream={stream} className="size-full object-contain" />

      <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg border border-white/8 bg-card px-2.5 py-1 text-xs text-white/70 backdrop-blur-xl">
        <MonitorUp className="size-3.5 text-primary-start" /> {name}&apos;s screen
      </span>

      <button
        type="button"
        onClick={onToggle}
        aria-label={expanded ? "Back to the problem and editor" : "Enlarge the shared screen"}
        title={expanded ? "Back to the editor (Esc)" : "Enlarge"}
        className={`absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-white/8 bg-card text-xs text-white/65 backdrop-blur-xl transition-colors duration-200 hover:text-white ${
          expanded ? "px-3 py-1.5" : "size-8 justify-center"
        }`}
      >
        {expanded ? (
          <>
            <Minimize2 className="size-3.5" /> Back to editor
          </>
        ) : (
          <Maximize2 className="size-4" />
        )}
      </button>
    </div>
  );
};

export default ScreenView;