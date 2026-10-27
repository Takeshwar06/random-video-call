import { useState } from 'react';
import Home from './components/Home.jsx';
import VideoRoom from './components/VideoRoom.jsx';

export default function App() {
  const [inCall, setInCall] = useState(false);
  const [notice, setNotice] = useState('');

  const start = () => { setNotice(''); setInCall(true); };
  const exit = (message = '') => { setNotice(message); setInCall(false); };

  return inCall ? <VideoRoom onExit={exit} /> : <Home onStart={start} notice={notice} />;
}
