import { useEffect, useRef, useState } from "react";
import { getPublicSessions } from "../api/sessions.api.js";
import { useSocket } from "../context/SocketContext.jsx";

const INITIAL = {
  status: "loading",
  rooms: [],
  pagination: { total: 0, totalPages: 1 },
  message: "",
};

const useLobby = (filters) => {
  const { socket } = useSocket();
  const [state, setState] = useState(INITIAL);
  const [reloadKey, setReloadKey] = useState(0);
  const lastKey = useRef(null);

  // A plain string, so the effect only reruns when a filter really changes
  const key = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;

    // New filters show loading; a live refresh keeps the old list on screen
    if (lastKey.current !== key) {
      lastKey.current = key;
      setState((prev) => ({ ...prev, status: "loading" }));
    }

    getPublicSessions(JSON.parse(key))
      .then((res) => {
        if (cancelled) return;
        setState({
          status: "ready",
          rooms: res.data.rooms,
          pagination: res.data.pagination,
          message: "",
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          status: "error",
          message:
            err.response?.data?.message || "Could not load rooms.",
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [key, reloadKey]);

  useEffect(() => {
    if (!socket) return undefined;

    let timer;

    const subscribe = () => socket.emit("lobby:subscribe");

    const refresh = () => {
      // Several changes can arrive together; one refetch is enough
      clearTimeout(timer);
      timer = setTimeout(() => setReloadKey((k) => k + 1), 300);
    };

    subscribe();

    const onConnect = () => {
      subscribe();
      refresh();
    };

    socket.on("connect", onConnect);
    socket.on("lobby:changed", refresh);

    return () => {
      clearTimeout(timer);
      socket.off("connect", onConnect);
      socket.off("lobby:changed", refresh);
      socket.emit("lobby:unsubscribe");
    };
  }, [socket]);

  return {
    ...state,
    reload: () => setReloadKey((k) => k + 1),
  };
};

export default useLobby;
