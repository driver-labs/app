export default function PracticeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="practice-shell">{children}</div>;
}
