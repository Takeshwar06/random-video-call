export default function Home({ onStart, notice }) {
  return (
    <main className="flex min-h-full flex-col justify-end gap-8 px-6 pb-12 pt-10 sm:px-14 sm:pb-16">
      {notice && (
        <p role="alert" className="max-w-md border border-white px-4 py-3 text-sm">
          {notice}
        </p>
      )}
      <h1 className="text-[clamp(4rem,17vw,14rem)] font-black leading-[0.85] tracking-tighter">
        Random
        <br />
        Chat
      </h1>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-sm text-lg text-white/70">
          Talk face to face with a stranger. One click connects you, one click moves you on.
          Nothing is recorded or stored.
        </p>
        <button
          onClick={onStart}
          className="border border-white bg-white px-10 py-4 text-lg font-semibold text-black transition hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          Start
        </button>
      </div>
    </main>
  );
}
