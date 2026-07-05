import DashboardTopbar from "@/components/DashboardTopbar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="app-shell">
      <div className="shell-frame">
        <DashboardTopbar />
        <div className="app-shell__content">{children}</div>
      </div>
    </div>
  );
}
