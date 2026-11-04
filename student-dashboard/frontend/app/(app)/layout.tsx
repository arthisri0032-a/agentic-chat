import Sidebar from "@/components/Sidebar";

/**
 * Layout for the app "inside the door" — dashboard, students, courses — as
 * opposed to the public landing page at "/", which has no sidebar.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[var(--page)]">{children}</main>
    </div>
  );
}
