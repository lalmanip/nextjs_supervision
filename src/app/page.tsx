export default function Home() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="max-w-lg w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold tracking-tight">Vivance Supervision</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          SuperAdmin portal for enterprise administration.
        </p>
        <a
          href="/supervision/login"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white/90"
        >
          Go to SuperAdmin Login
        </a>
      </div>
    </div>
  );
}
