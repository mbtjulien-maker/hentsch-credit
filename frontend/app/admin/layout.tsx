import { DashboardProvider } from "@/components/dashboard/dashboard-context";
import { AdminAuthGate } from "@/components/admin/admin-auth-gate";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";

// Coquille de la zone back-office ("/admin/*") — palette "Premium Fintech" partagée avec
// l'espace client (cf. app/globals.css), déclinée en clair et en sombre selon la même
// classe .dark globale (cf. lib/theme-provider.tsx), plutôt qu'un fond toujours sombre
// isolé du reste de l'app. Réutilise l'authentification réelle existante
// (DashboardProvider lit la session via /auth/me) mais avec sa propre garde de rôle
// (AdminAuthGate) : un compte CLIENT ne voit jamais cette coquille, même vide.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardProvider>
        <AdminAuthGate>
          <div className="flex min-h-screen w-full">
            <AdminSidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <AdminTopbar />
              <AdminMobileNav />
              <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
            </div>
          </div>
        </AdminAuthGate>
      </DashboardProvider>
    </div>
  );
}
