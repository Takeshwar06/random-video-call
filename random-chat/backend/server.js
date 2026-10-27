import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Server } from 'socket.io';

const PORT = Number(process.env.PORT) || 3001;
const ORIGINS = (process.env.CLIENT_ORIGIN || '*').split(',').map((s) => s.trim());

const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Random Chat signaling server');
});

const io = new Server(httpServer, {
  cors: { origin: ORIGINS.includes('*') ? '*' : ORIGINS },
});

// ---- In-memory state (the server is the single source of truth) ----
const waitingUsers = [];          // socket ids waiting for a partner
const activeRooms = new Map();    // sessionId -> { offerer, answerer }
const userSessions = new Map();   // socket id -> sessionId

const isConnected = (id) => io.sockets.sockets.has(id);

function dequeue(id) {
  const i = waitingUsers.indexOf(id);
  if (i !== -1) waitingUsers.splice(i, 1);
}

// Node is single-threaded and this function never awaits, so a match is atomic:
// simultaneous "find" events are processed one after the other.
function enqueue(id) {
  if (!isConnected(id) || userSessions.has(id) || waitingUsers.includes(id)) return;

  const candidates = waitingUsers.filter((other) => other !== id && isConnected(other));
  if (candidates.length === 0) {
    waitingUsers.push(id);
    return;
  }

  const peer = candidates[Math.floor(Math.random() * candidates.length)];
  dequeue(peer);

  const sessionId = randomUUID();
  // The user who waited longest is always the offerer (deterministic rule).
  activeRooms.set(sessionId, { offerer: peer, answerer: id });
  userSessions.set(peer, sessionId);
  userSessions.set(id, sessionId);

  io.to(peer).emit('matched', { sessionId, initiator: true });
  io.to(id).emit('matched', { sessionId, initiator: false });
}

// Ends the user's session (if any) and tells the partner. Returns true if one existed.
function endSession(id) {
  const sessionId = userSessions.get(id);
  if (!sessionId) return false;

  const room = activeRooms.get(sessionId);
  activeRooms.delete(sessionId);
  userSessions.delete(id);

  if (room) {
    const peer = room.offerer === id ? room.answerer : room.offerer;
    userSessions.delete(peer);
    io.to(peer).emit('peer-left', { sessionId });
  }
  return true;
}

io.on('connection', (socket) => {
  const id = socket.id;

  socket.on('find', () => enqueue(id));

  // Skip: end the current call, then re-queue ONLY the skipping user.
  // The client names the session it is skipping, so a stale or double-clicked skip
  // can never tear down the brand-new session that replaced it.
  socket.on('skip', (msg) => {
    const current = userSessions.get(id);
    if (current && msg?.sessionId !== current) return;
    endSession(id);
    enqueue(id); // no-op if already waiting, so repeated skips never duplicate entries
  });

  socket.on('end', () => {
    endSession(id);
    dequeue(id);
  });

  // Relay WebRTC signaling (offer / answer / ICE) to the matched partner only.
  socket.on('signal', (msg) => {
    if (!msg || typeof msg !== 'object' || !msg.data || typeof msg.data !== 'object') return;
    const sessionId = userSessions.get(id);
    if (!sessionId || msg.sessionId !== sessionId) return; // stale or foreign session
    const room = activeRooms.get(sessionId);
    if (!room) return;
    const peer = room.offerer === id ? room.answerer : room.offerer;
    io.to(peer).emit('signal', { sessionId, data: msg.data });
  });

  socket.on('disconnect', () => {
    dequeue(id);
    endSession(id);
  });
});

httpServer.listen(PORT, () => console.log(`Signaling server listening on :${PORT}`));
