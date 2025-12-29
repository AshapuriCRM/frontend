import { AdminNavBar } from "./AdminNavBar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AdminNavBar />
      {children}
    </div>
  );
}
