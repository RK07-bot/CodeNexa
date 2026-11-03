import { useCallback, useEffect, useRef, useState } from "react";

// Every call has the same three media slots in the same order on both sides, so
// switching the microphone, camera or screen on and off only swaps a track and never
// needs a new negotiation. That is also how the remote side knows which video is which.
const SLOTS = ["audio", "camera", "screen"];
const NO_REMOTE = { audio: null, camera: null, screen: null };
const NO_MEDIA = { audio: false, camera: false, screen: false };
const NO_PEER = { audio: false, video: false, screen: false };

const LABELS = { audio: "microphone", camera: "camera", screen: "screen" };

const buildIceServers = () => {
  const servers = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];

  // STUN is enough for most networks. Strict firewalls and some mobile networks need a TURN relay.
  const turn = import.meta.env.VITE_TURN_URL;
  if (turn) {
    servers.push({
      urls: turn.split(",").map((u) => u.trim()).filter(Boolean),
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    });
  }

  return servers;
};

const ICE_SERVERS = buildIceServers();

const GETTERS = {
  audio: () =>
    navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    }),
  camera: () =>
    navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
    }),
  screen: () =>
    navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 15 } },
      audio: false,
    }),
};

const newCallId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const mediaMessage = (err, label) => {
  if (err?.name === "NotAllowedError") return `Allow ${label} access in your browser to use it.`;
  if (err?.name === "NotFoundError") return `No ${label} was found on this device.`;
  if (err?.name === "NotReadableError") return `Your ${label} is being used by another app.`;
  return `Could not start your ${label}.`;
};

// text on a screen needs sharp pixels more than smooth motion
const tuneScreen = async (sender) => {
  try {
    const params = sender.getParameters();
    if (!params.encodings?.length) params.encodings = [{}];
    params.encodings[0].maxBitrate = 2_500_000;
    params.degradationPreference = "maintain-resolution";
    await sender.setParameters(params);
  } catch {
    // the browser keeps its own defaults
  }
};

// Video call between the two people in a room. The server only passes messages along:
//   rtc:ready   "I need a call", the person with the smaller username always starts it
//   rtc:signal  offers, answers and ICE candidates, tagged with the id of the call they belong to
//   media:state who has the microphone, camera and screen switched on
// The call lives as long as `enabled` is true, so it survives the move to the next problem.
const useCall = ({ socket, enabled, roomCode, me, partner, presence }) => {
  const [local, setLocal] = useState(NO_MEDIA);
  const [localCamera, setLocalCamera] = useState(null);
  const [remote, setRemote] = useState(NO_REMOTE);
  const [peer, setPeer] = useState(NO_PEER);
  const [connection, setConnection] = useState("idle");
  const [error, setError] = useState("");

  const tracksRef = useRef({ audio: null, camera: null, screen: null });
  const localRef = useRef(NO_MEDIA);
  const callRef = useRef(null);
  const activeRef = useRef(false);
  const busyRef = useRef(new Set());
  const ctxRef = useRef({});
  const actionsRef = useRef({});

  const isCaller = Boolean(partner) && me < partner;
  const meOnline = presence?.participants.some((p) => p.username === me && p.connected) ?? false;
  const partnerOnline =
    presence?.participants.some((p) => p.username === partner && p.connected) ?? false;

  useEffect(() => {
    ctxRef.current = { isCaller, roomCode, me, partner };
  }, [isCaller, roomCode, me, partner]);

  const announce = useCallback(() => {
    const s = localRef.current;
    socket?.emit("media:state", { audio: s.audio, video: s.camera, screen: s.screen });
  }, [socket]);

  // puts a track (or nothing) into one slot, in the live call too
  const setSlot = useCallback(
    (slot, track) => {
      const old = tracksRef.current[slot];
      if (old && old !== track) old.stop();

      tracksRef.current[slot] = track;
      localRef.current = { ...localRef.current, [slot]: Boolean(track) };
      setLocal(localRef.current);
      if (slot === "camera") setLocalCamera(track ? new MediaStream([track]) : null);

      const sender = callRef.current?.pc.getTransceivers()[SLOTS.indexOf(slot)]?.sender;
      if (sender) {
        sender
          .replaceTrack(track)
          .then(() => track && slot === "screen" && tuneScreen(sender))
          .catch(() => {});
      }

      announce();
    },
    [announce],
  );

  const releaseMedia = useCallback(() => {
    Object.values(tracksRef.current).forEach((t) => t?.stop());
    tracksRef.current = { audio: null, camera: null, screen: null };
    localRef.current = NO_MEDIA;
    setLocal(NO_MEDIA);
    setLocalCamera(null);
  }, []);

  const toggle = useCallback(
    async (slot) => {
      if (busyRef.current.has(slot)) return;
      setError("");

      // switching off releases the device, so the browser's recording light goes out
      if (tracksRef.current[slot]) {
        setSlot(slot, null);
        return;
      }

      busyRef.current.add(slot);

      try {
        const stream = await GETTERS[slot]();
        const track = slot === "audio" ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];

        // the page was left while the browser was asking for permission
        if (!activeRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (slot === "screen") track.contentHint = "detail";
        // unplugging a device or pressing the browser's own "Stop sharing" ends the track
        track.onended = () => {
          if (tracksRef.current[slot] === track) setSlot(slot, null);
        };

        setSlot(slot, track);
      } catch (err) {
        // closing the screen picker is not an error
        if (slot === "screen" && err?.name === "NotAllowedError") return;
        setError(mediaMessage(err, LABELS[slot]));
      } finally {
        busyRef.current.delete(slot);
      }
    },
    [setSlot],
  );

  // the connection itself
  useEffect(() => {
    if (!socket || !enabled) return undefined;

    activeRef.current = true;
    let lastReady = 0;
    let queue = Promise.resolve();

    const closeCall = () => {
      const call = callRef.current;
      callRef.current = null;

      if (call) {
        const { pc } = call;
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onnegotiationneeded = null;
        pc.onconnectionstatechange = null;
        pc.close();
      }

      setRemote(NO_REMOTE);
      setConnection("idle");
    };

    const attachTracks = (pc) => {
      pc.getTransceivers()
        .slice(0, SLOTS.length)
        .forEach((t, i) => {
          t.sender.replaceTrack(tracksRef.current[SLOTS[i]] ?? null).catch(() => {});
        });
    };

    const createCall = (id, polite) => {
      closeCall();

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const call = {
        id,
        pc,
        polite,
        startedAt: Date.now(),
        makingOffer: false,
        ignoreOffer: false,
        remoteSet: false,
        pending: [],
      };
      callRef.current = call;
      setConnection("connecting");

      pc.onicecandidate = ({ candidate }) => {
        if (candidate && callRef.current === call) {
          socket.emit("rtc:signal", { call: id, candidate: candidate.toJSON() });
        }
      };

      pc.ontrack = ({ track, transceiver }) => {
        if (callRef.current !== call) return;
        const slot = SLOTS[pc.getTransceivers().indexOf(transceiver)];
        if (slot) setRemote((prev) => ({ ...prev, [slot]: new MediaStream([track]) }));
      };

      pc.onnegotiationneeded = async () => {
        if (callRef.current !== call) return;

        try {
          call.makingOffer = true;
          await pc.setLocalDescription();

          if (callRef.current === call) {
            const { type, sdp } = pc.localDescription;
            socket.emit("rtc:signal", { call: id, description: { type, sdp } });
          }
        } catch (err) {
          console.warn("Could not create an offer:", err.message);
        } finally {
          call.makingOffer = false;
        }
      };

      pc.onconnectionstatechange = () => {
        if (callRef.current !== call) return;

        const state = pc.connectionState;
        if (state === "connected") {
          setConnection("connected");
          announce();
        } else if (state === "failed" || state === "closed") {
          setConnection("failed");
        } else {
          setConnection("connecting");
        }
      };

      return call;
    };

    const startAsCaller = () => {
      const { pc } = createCall(newCallId(), false);
      const t = tracksRef.current;

      // adding these is what makes the browser create the first offer
      pc.addTransceiver(t.audio ?? "audio", { direction: "sendrecv" });
      pc.addTransceiver(t.camera ?? "video", { direction: "sendrecv" });
      pc.addTransceiver(t.screen ?? "video", { direction: "sendrecv" });
    };

    const handleSignal = async ({ call: id, description, candidate }) => {
      let call = callRef.current;

      if (!call || call.id !== id) {
        // only the caller makes call ids, the other side follows a new id with a fresh connection
        if (ctxRef.current.isCaller || description?.type !== "offer") return;
        call = createCall(id, true);
      }

      const { pc } = call;

      if (description) {
        // both sides offering at once: the polite side gives way, the other ignores the offer
        const collision =
          description.type === "offer" && (call.makingOffer || pc.signalingState !== "stable");
        call.ignoreOffer = !call.polite && collision;
        if (call.ignoreOffer) return;

        await pc.setRemoteDescription(description);
        if (callRef.current !== call) return;

        call.remoteSet = true;
        for (const pending of call.pending.splice(0)) {
          await pc.addIceCandidate(pending).catch(() => {});
        }

        if (description.type === "offer") {
          // the answering side sends back on the same three slots
          try {
            pc.getTransceivers()
              .slice(0, SLOTS.length)
              .forEach((t) => {
                t.direction = "sendrecv";
              });
          } catch {
            // a transceiver that is already stopped keeps its direction
          }
          attachTracks(pc);

          await pc.setLocalDescription();
          if (callRef.current !== call) return;

          const { type, sdp } = pc.localDescription;
          socket.emit("rtc:signal", { call: id, description: { type, sdp } });
        }
      } else if (candidate) {
        // candidates can arrive before the description they belong to is applied
        if (!call.remoteSet) {
          call.pending.push(candidate);
          return;
        }

        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          if (!call.ignoreOffer) console.warn("Bad ICE candidate:", err.message);
        }
      }
    };

    const emitReady = () => socket.emit("rtc:ready");

    // asks for a call, but only when both people are in the room and there is no working call yet
    const maybeReady = (meOn, partnerOn) => {
      if (!meOn || !partnerOn || !socket.connected) return;
      if (callRef.current?.pc.connectionState === "connected") return;

      const now = Date.now();
      if (now - lastReady < 800) return;
      lastReady = now;
      emitReady();
    };

    const onSignal = (payload) => {
      queue = queue
        .then(() => handleSignal(payload ?? {}))
        .catch((err) => console.warn("Call signal failed:", err.message));
    };

    // the partner has no working call: the caller starts one, the other side says it is here too
    const onReady = () => {
      if (!ctxRef.current.isCaller) return emitReady();

      // both people ask when they join, so the second request arrives right after the call started
      const current = callRef.current;
      const justStarted =
        current && Date.now() - current.startedAt < 1500 && current.pc.connectionState !== "failed";
      if (!justStarted) startAsCaller();
    };

    const onPeerState = (state) =>
      setPeer({
        audio: Boolean(state?.audio),
        video: Boolean(state?.video),
        screen: Boolean(state?.screen),
      });

    // presence changes after a reconnect are the signal that the room was joined again
    const onPresence = (payload) => {
      const { roomCode: code, me: self, partner: other } = ctxRef.current;
      if (payload.roomCode !== code) return;

      const online = (name) => payload.participants.some((p) => p.username === name && p.connected);
      maybeReady(online(self), online(other));
    };

    socket.on("rtc:signal", onSignal);
    socket.on("rtc:ready", onReady);
    socket.on("media:state", onPeerState);
    socket.on("presence:update", onPresence);

    actionsRef.current = {
      maybeReady,
      reconnect: () => {
        closeCall();
        emitReady();
      },
    };

    return () => {
      activeRef.current = false;
      actionsRef.current = {};

      socket.off("rtc:signal", onSignal);
      socket.off("rtc:ready", onReady);
      socket.off("media:state", onPeerState);
      socket.off("presence:update", onPresence);

      closeCall();
      releaseMedia();
    };
  }, [socket, enabled, announce, releaseMedia]);

  // covers the moment the call becomes possible without a new presence message
  useEffect(() => {
    if (enabled) actionsRef.current.maybeReady?.(meOnline, partnerOnline);
  }, [enabled, meOnline, partnerOnline]);

  const reconnect = useCallback(() => actionsRef.current.reconnect?.(), []);

  const mediaDevices = typeof navigator === "undefined" ? null : navigator.mediaDevices;

  return {
    local,
    localCamera,
    remote,
    // what the partner switched on, nothing once they have left
    peer: partnerOnline ? peer : NO_PEER,
    connection: enabled ? connection : "idle",
    error,
    toggle,
    reconnect,
    supported: Boolean(mediaDevices?.getUserMedia && typeof RTCPeerConnection !== "undefined"),
    screenSupported: Boolean(mediaDevices?.getDisplayMedia),
  };
};

export default useCall;