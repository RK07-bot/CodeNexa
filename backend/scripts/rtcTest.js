import dotenv from "dotenv";
dotenv.config();

import { io } from "socket.io-client";

const [emailA, passwordA, emailB, passwordB] = process.argv.slice(2);

if (!passwordB) {
  console.log("Usage: node scripts/rtcTest.js emailA passwordA emailB passwordB");
  process.exit(1);
}

const API = `http://localhost:${process.env.PORT || 3000}`;
const EVENTS = ["rtc:signal", "media:state", "room:taken-over", "presence:update"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const step = (text) => console.log(`\n--- ${text}`);

// force: true logs the account out of any other device, so use test accounts
const login = async (email, password) => {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, force: true }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email} (${res.status})`);

  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
};

const client = (cookie) => async (path, method = "GET", body) => {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", cookie },
    body: body && JSON.stringify(body),
  });
  return res.json();
};

const leaveOpenRoom = async (call) => {
  const { session } = await call("/sessions/me/current");
  if (!session) return;
  await call(`/sessions/${session.roomCode}/${session.status === "waiting" ? "cancel" : "end"}`, "POST");
};

const connect = (name, cookie) =>
  new Promise((resolve, reject) => {
    const socket = io(API, { extraHeaders: { cookie }, transports: ["websocket"] });

    for (const event of EVENTS) {
      socket.on(event, (data) => console.log(`  [${name}] ${event}`, JSON.stringify(data)));
    }

    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => reject(new Error(`${name} could not connect: ${err.message}`)));
  });

const ask = (socket, event, data) => new Promise((resolve) => socket.emit(event, data, resolve));

const cookieA = await login(emailA, passwordA);
const cookieB = await login(emailB, passwordB);
const a = client(cookieA);
const b = client(cookieB);

step("Setup: leave any old rooms");
await leaveOpenRoom(a);
await leaveOpenRoom(b);

step("ICE servers while not in a room (expect a refusal)");
console.log("  ", JSON.stringify(await a("/sessions/rtc/config")));

step("A creates a room, B joins, both connect");
const { session } = await a("/sessions", "POST", { problem: "two-sum", visibility: "private" });
const code = session.roomCode;
await b(`/sessions/${code}/join`, "POST");

const socketA = await connect("A", cookieA);
const socketB = await connect("B", cookieB);
await ask(socketA, "room:join", { roomCode: code });
await ask(socketB, "room:join", { roomCode: code });
await sleep(500);

step("ICE servers inside a room (expect the list)");
console.log("  ", JSON.stringify(await a("/sessions/rtc/config")));

step("A sends an offer, only B should receive it");
socketA.emit("rtc:signal", { description: { type: "offer", sdp: "v=0 test" } });
await sleep(400);

step("A sends a bad description, nobody should receive anything");
socketA.emit("rtc:signal", { description: { type: "evil", sdp: "x" } });
await sleep(400);

step("A sends a candidate with an extra field, B should get it without that field");
socketA.emit("rtc:signal", {
  candidate: {
    candidate: "candidate:1 1 udp 1 1.2.3.4 5000 typ host",
    sdpMid: "0",
    sdpMLineIndex: 0,
    hack: "should be removed",
  },
});
await sleep(400);

step("B sends sloppy media state, A should receive plain booleans");
socketB.emit("media:state", { audio: "yes", video: 0, screen: true, extra: "x" });
await sleep(400);

step("A opens the room in a second tab, the first tab should be told it was taken over");
const socketA2 = await connect("A2", cookieA);
console.log("  ack:", await ask(socketA2, "room:join", { roomCode: code }));
await sleep(400);
console.log("  old tab tries to chat:", await ask(socketA, "chat:send", { text: "still here?" }));

step("B leaves the room page, the other side should see B as disconnected");
console.log("  ack:", await ask(socketB, "room:leave"));
await sleep(500);

step("Cleanup");
await a(`/sessions/${code}/end`, "POST");
socketA.disconnect();
socketA2.disconnect();
socketB.disconnect();
process.exit(0);