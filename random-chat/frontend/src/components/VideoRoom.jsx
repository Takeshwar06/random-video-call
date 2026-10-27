import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import CallControls from './CallControls.jsx';

const SERVER_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const STATUS_LABEL = {
  searching: 'Searching',
  connecting: 'Connecting',
  connected: 'Connected',
  failed: 'Connection failed',
};

function mediaErrorMessage(err) {
  if (err?.name === 'NotAllowedError') return 'Camera and microphone access was denied. Allow access in your browser and press Start again.';
  if (err?.name === 'NotFoundError') return 'No camera or microphone found. Connect one and press Start again.';
  return 'Could not open your camera or microphone. Check that no other app is using them.';
}

export default function VideoRoom({ onExit }) {
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const actions = useRef({});
  const streamRef = useRef(null);
  const [status, setStatus] = useState('searching');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [serverError, setServerError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let socket = null;
    let pc = null;
    let sessionId = null;
    let pendingIce = [];

    const closePc = () => {
      if (pc) {
        pc.onicecandidate = pc.ontrack = pc.onconnectionstatechange = null;
        pc.close();
        pc = null;
      }
      sessionId = null;
      pendingIce = [];
      if (remoteRef.current) remoteRef.current.srcObject = null;
    };

    const cleanup = () => {
      closePc();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
      }
    };

    const onMatched = async ({ sessionId: sid, initiator }) => {
      closePc();
      sessionId = sid;
      setStatus('connecting');

      const conn = new RTCPeerConnection(RTC_CONFIG);
      pc = conn;
      streamRef.current.getTracks().forEach((t) => conn.addTrack(t, streamRef.current));

      conn.onicecandidate = (e) => {
        if (e.candidate && pc === conn) socket.emit('signal', { sessionId: sid, data: { candidate: e.candidate } });
      };
      conn.ontrack = (e) => {
        if (pc === conn && remoteRef.current) remoteRef.current.srcObject = e.streams[0];
      };
      conn.onconnectionstatechange = () => {
        if (pc !== conn) return;
        if (conn.connectionState === 'connected') setStatus('connected');
        if (conn.connectionState === 'failed') setStatus('failed');
      };

      if (initiator) {
        try {
          const offer = await conn.createOffer();
          await conn.setLocalDescription(offer);
          if (pc === conn) socket.emit('signal', { sessionId: sid, data: { sdp: conn.localDescription } });
        } catch {
          if (pc === conn) setStatus('failed');
        }
      }
    };

    const onSignal = async ({ sessionId: sid, data }) => {
      if (!pc || sid !== sessionId) return; // ignore messages from old sessions
      const conn = pc;
      try {
        if (data.sdp) {
          await conn.setRemoteDescription(data.sdp);
          if (data.sdp.type === 'offer') {
            const answer = await conn.createAnswer();
            await conn.setLocalDescription(answer);
            if (pc === conn) socket.emit('signal', { sessionId: sid, data: { sdp: conn.localDescription } });
          }
          for (const c of pendingIce.splice(0)) await conn.addIceCandidate(c);
        } else if (data.candidate) {
          if (conn.remoteDescription) await conn.addIceCandidate(data.candidate);
          else pendingIce.push(data.candidate);
        }
      } catch {
        if (pc === conn) setStatus('failed');
      }
    };

    (async () => {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        if (!cancelled) onExit(mediaErrorMessage(err));
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      localRef.current.srcObject = stream;

      socket = io(SERVER_URL);
      socket.on('connect', () => {
        setServerError(false);
        closePc();
        setStatus('searching');
        socket.emit('find');
      });
      socket.on('connect_error', () => setServerError(true));
      socket.on('matched', onMatched);
      socket.on('signal', onSignal);
      socket.on('peer-left', ({ sessionId: sid }) => {
        if (sid !== sessionId) return;
        cleanup();
        onExit('Your partner left the call. Press Start to meet someone new.');
      });
    })();

    actions.current = {
      skip: () => {
        if (!socket) return;
        const skipped = sessionId;
        closePc();
        setStatus('searching');
        socket.emit('skip', { sessionId: skipped });
      },
      end: () => {
        socket?.emit('end');
        cleanup();
        onExit();
      },
    };

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (kind, setter) => {
    const tracks = kind === 'audio' ? streamRef.current?.getAudioTracks() : streamRef.current?.getVideoTracks();
    if (!tracks?.length) return;
    const next = !tracks[0].enabled;
    tracks.forEach((t) => (t.enabled = next));
    setter(next);
  };

  const label = serverError ? 'Cannot reach server' : STATUS_LABEL[status];

  return (
    <main className="flex h-full flex-col gap-3 p-3 sm:p-5">
      <div className="relative min-h-0 flex-1 border border-white bg-black">
        <video ref={remoteRef} autoPlay playsInline className="h-full w-full object-cover" />

        {status !== 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black px-6 text-center text-xl font-semibold sm:text-3xl">
            {status === 'failed'
              ? 'Could not connect to this person. Press Skip to find someone else.'
              : status === 'searching'
              ? 'Looking for someone to talk to…'
              : 'Setting up the call…'}
          </div>
        )}

        <div role="status" className="absolute left-3 top-3 border border-white bg-black px-3 py-1 text-sm font-semibold">
          {label}
        </div>

        <div className="absolute bottom-3 right-3 aspect-[3/4] w-28 border border-white bg-black sm:w-44">
          <video ref={localRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-black text-xs">Camera off</div>
          )}
        </div>
      </div>

      <CallControls
        micOn={micOn}
        camOn={camOn}
        canSkip={status !== 'searching'}
        onToggleMic={() => toggle('audio', setMicOn)}
        onToggleCam={() => toggle('video', setCamOn)}
        onSkip={() => actions.current.skip?.()}
        onEnd={() => actions.current.end?.()}
      />
    </main>
  );
}
