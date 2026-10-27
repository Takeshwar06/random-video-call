const base =
  'border border-white px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40 sm:px-6';
const idle = 'bg-black text-white hover:bg-white hover:text-black';
const active = 'bg-white text-black hover:bg-black hover:text-white';

export default function CallControls({ micOn, camOn, canSkip, onToggleMic, onToggleCam, onSkip, onEnd }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      <button onClick={onToggleMic} aria-pressed={!micOn} className={`${base} ${micOn ? idle : active}`}>
        {micOn ? 'Mute' : 'Unmute'}
      </button>
      <button onClick={onToggleCam} aria-pressed={!camOn} className={`${base} ${camOn ? idle : active}`}>
        {camOn ? 'Camera off' : 'Camera on'}
      </button>
      <button onClick={onSkip} disabled={!canSkip} className={`${base} ${active}`}>
        Skip
      </button>
      <button onClick={onEnd} className={`${base} ${idle}`}>
        End call
      </button>
    </div>
  );
}
