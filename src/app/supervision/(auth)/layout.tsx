export default function SupervisionAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-dvh bg-zinc-50 dark:bg-black">{children}</div>;
}

