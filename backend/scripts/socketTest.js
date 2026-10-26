import dotenv from "dotenv";
dotenv.config();

import { io } from "socket.io-client";

const [emailA, passwordA, emailB, passwordB] = process.argv.slice(2);

if (!passwordB) {
  console.log("Usage: node scripts/socketTest.js emailA passwordA emailB passwordB");
  process.exit(1);
}

const API = `http://localhost:${process.env.PORT || 3000}`;
const GRACE = Number(process.env.RECONNECT_GRACE_SECONDS) || 60;

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

  // only the name=value part of each cookie is sent back
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

    for (const event of ["presence:update", "chat:message", "code:update", "session:updated"]) {
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

step("Setup: leave any old rooms, create a private room as A");
await leaveOpenRoom(a);
await leaveOpenRoom(b);
const created = await a("/sessions", "POST", { problem: "two-sum", visibility: "private" });
const code = created.session.roomCode;
console.log("  room code:", code);

step("A connects and joins the room");
const socketA = await connect("A", cookieA);
console.log("  ack:", await ask(socketA, "room:join", { roomCode: code }));

step("B joins over REST, then connects and joins the room");
await b(`/sessions/${code}/join`, "POST");
let socketB = await connect("B", cookieB);
console.log("  ack:", await ask(socketB, "room:join", { roomCode: code }));

step("Chat: A sends a message, then an empty one");
console.log("  ack:", await ask(socketA, "chat:send", { text: "hello from A" }));
console.log("  ack:", await ask(socketA, "chat:send", { text: "   " }));

step("Code sync: A sends an update, only B should receive it");
socketA.emit("code:update", { roomCode: code, update: "abc" });
await sleep(500);

step("B asks to join a room that does not exist");
console.log("  ack:", await ask(socketB, "room:join", { roomCode: "ZZZ999" }));

step("B drops, then comes back before the grace period ends");
socketB.disconnect();
await sleep(2000);
socketB = await connect("B", cookieB);
console.log("  ack:", await ask(socketB, "room:join", { roomCode: code }));
await sleep((GRACE + 3) * 1000);
console.log("  room status after the grace period:", (await a(`/sessions/${code}`)).session.status);

step(`B drops and stays away, the room should end after ${GRACE} seconds`);
socketB.disconnect();
await sleep((GRACE + 5) * 1000);
const final = (await a(`/sessions/${code}`)).session;
console.log("  final:", final.status, final.endReason);

socketA.disconnect();
process.exit(0);