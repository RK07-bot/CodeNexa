import { useCallback, useEffect, useRef, useState } from "react";

const LEFT_MIN = 24;
const LEFT_MAX = 55;
const EDITOR_MIN = 30;
const EDITOR_MAX = 82;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const useWorkspaceResize = ({ left = 34, editor = 62 } = {}) => {
  const [leftWidth, setLeftWidth] = useState(left);
  const [editorHeight, setEditorHeight] = useState(editor);
  const [isResizing, setIsResizing] = useState(false);

  const workspaceRef = useRef(null);
  const rightPanelRef = useRef(null);
  const dragType = useRef(null);

  const startResize = useCallback((type, event) => {
    // the panels are stacked on small screens, so there is nothing to drag
    if (window.matchMedia("(max-width: 1023px)").matches) return;

    event.preventDefault();
    dragType.current = type;
    setIsResizing(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  useEffect(() => {
    if (!isResizing) return undefined;

    const handleMove = (event) => {
      if (dragType.current === "horizontal" && workspaceRef.current) {
        const rect = workspaceRef.current.getBoundingClientRect();
        // the 12px separator takes its space out of the total
        const next = ((event.clientX - rect.left - 6) / (rect.width - 12)) * 100;
        setLeftWidth(clamp(next, LEFT_MIN, LEFT_MAX));
      }

      if (dragType.current === "vertical" && rightPanelRef.current) {
        const rect = rightPanelRef.current.getBoundingClientRect();
        const next = ((event.clientY - rect.top) / rect.height) * 100;
        setEditorHeight(clamp(next, EDITOR_MIN, EDITOR_MAX));
      }
    };

    const stop = () => {
      dragType.current = null;
      setIsResizing(false);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [isResizing]);

  const adjustLeft = (delta) => setLeftWidth((w) => clamp(w + delta, LEFT_MIN, LEFT_MAX));
  const adjustEditor = (delta) => setEditorHeight((h) => clamp(h + delta, EDITOR_MIN, EDITOR_MAX));

  return {
    leftWidth,
    editorHeight,
    isResizing,
    startResize,
    adjustLeft,
    adjustEditor,
    workspaceRef,
    rightPanelRef,
  };
};

export default useWorkspaceResize;