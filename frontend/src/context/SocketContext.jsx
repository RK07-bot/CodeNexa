import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { refreshSession } from "../api/axiosInstance.js";
import { SERVER_URL } from "../lib/config.js";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const loggedIn = Boolean(user);

  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [takenOver, setTakenOver] = useState(null);

  const socketRef = useRef(null);
  const activeRoom = useRef(null);

  useEffect(() => {
    if (!loggedIn) return undefined;

    const instance = io(SERVER_URL, { withCredentials: true });
    let lastRefresh = 0;

    // after any reconnect the server has forgotten the room, so it is joined again
    const rejoin = () => {
      if (activeRoom.current) instance.emit("room:join", { roomCode: activeRoom.current });
    };

    instance.on("connect", () => {
      setConnected(true);
      rejoin();
    });

    instance.on("disconnect", () => setConnected(false));

    instance.on("room:taken-over", ({ roomCode }) => {
      // the seat now belongs to another tab, so this one must not rejoin by itself
      activeRoom.current = null;
      setTakenOver({ roomCode });
    });

    instance.on("connect_error", async (err) => {
      // the access token lasts 15 minutes, so a rejected handshake usually just needs a refresh
      if (err.message !== "Not authenticated") return;
      if (Date.now() - lastRefresh < 30000) return;

      lastRefresh = Date.now();

      try {
      await refreshSession();
        instance.connect();
      } catch {
        // the login really is over, the auth layer handles that
      }
    });

    socketRef.current = instance;
    setSocket(instance);

    return () => {
      instance.disconnect();
      socketRef.current = null;
      activeRoom.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, [loggedIn]);

  const joinRoom = useCallback((roomCode) => {
    activeRoom.current = roomCode;
    setTakenOver(null);

    if (socketRef.current?.connected) {
      socketRef.current.emit("room:join", { roomCode });
    }
  }, []);

  const leaveRoom = useCallback(() => {
    activeRoom.current = null;
    socketRef.current?.emit("room:leave");
  }, []);

  const value = useMemo(
    () => ({ socket, connected, joinRoom, leaveRoom, takenOver }),
    [socket, connected, joinRoom, leaveRoom, takenOver],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);