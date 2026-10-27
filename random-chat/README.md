# Random Chat

Random one-to-one video chat. React + Vite + Tailwind + native WebRTC on the frontend, Node.js + Socket.IO signaling on the backend. Video never touches the server; it only relays offers, answers and ICE candidates.

## Run locally

Backend (port 3001):

    cd backend
    npm install
    npm run dev

Frontend (port 5173), in a second terminal:

    cd frontend
    cp .env.example .env
    npm install
    npm run dev

## Test a call with two windows

1. Open http://localhost:5173 in one browser window and press Start. Allow camera and microphone. The status reads Searching.
2. Open a second window (a private/incognito window works well) at the same address and press Start. Both windows should move to Connecting, then Connected, with the stranger's video large and your own preview in the corner.
3. Try Mute and Camera off: the other window hears or sees the change, and the call stays up.
4. Press Skip in one window. The other window returns to the home screen with a notice, and the skipper goes back to Searching.
5. Press End call: you return to the home screen and your camera light turns off. The other window is notified.
6. Close one tab mid-call: the other window is told the partner left.

Both windows on one machine share a single camera. Chrome allows this; if a browser blocks it, use two browsers or two devices on the same network (camera access on a non-localhost address needs HTTPS).

## Deploy

Backend (any Node host that supports WebSockets, such as Render, Railway or Fly.io):

- Root directory: `backend`. Build command: `npm install`. Start command: `npm start`.
- Environment variables: `CLIENT_ORIGIN` set to your frontend URL (comma-separate several), `PORT` if the host does not set it.
- Serverless platforms that do not keep long-lived connections will not work.

Frontend (any static host, such as Vercel, Netlify or Cloudflare Pages):

- Root directory: `frontend`. Build command: `npm run build`. Output directory: `dist`.
- Environment variable: `VITE_BACKEND_URL` set to your deployed backend URL (https).
- The site must be served over HTTPS for camera access.

Note: the app uses a public STUN server only. Some strict networks (symmetric NAT, corporate firewalls) need a TURN server; add one to `RTC_CONFIG` in `frontend/src/components/VideoRoom.jsx` for production use.
