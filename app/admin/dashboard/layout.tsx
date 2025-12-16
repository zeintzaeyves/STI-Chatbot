import AdminSidebar from "../../components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex relative min-h-screen bg-gradient-to-br from-[#061326] via-[#0b2142] to-[#10315a] text-slate-100 overflow-hidden">
      {/* Background Glow (blue + yellow accent) */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,230,0,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(0,119,255,0.15),transparent_70%)]" />
      </div>
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8 backdrop-blur-xl bg-white/5 border-l border-white/10 shadow-inner relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Dynamic Content */}
          {children}
        </div>
      </main>
    </div>
  );
}
