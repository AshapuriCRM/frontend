"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Building2, LayoutDashboard, Folder, LogOut, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

export function AdminNavBar() {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSelectCompanyClick = () => {
    router.push("/companies");
  };

  const handleAdminDashboardClick = () => {
    router.push("/admin/super");
  };

  const handleFilesAssetsClick = () => {
    router.push("/admin/media");
  };

  const handleLogout = async () => {
    await logout();
  };

  const isSuperAdmin = pathname === "/admin/super";
  const isMedia = pathname === "/admin/media";

  return (
    <div className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Ashapuri CRM</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            {!isSuperAdmin && (
              <Button
                variant="default"
                className="gradient-button"
                onClick={handleAdminDashboardClick}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Admin Dashboard
              </Button>
            )}
            <Button
              variant="default"
              className="gradient-button"
              onClick={handleSelectCompanyClick}
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Select Company
            </Button>
            {!isMedia && (
              <Button
                variant="outline"
                className="gradient-button"
                onClick={handleFilesAssetsClick}
              >
                <Folder className="h-4 w-4 mr-2" />
                Files & Assets
              </Button>
            )}
            <Button
              variant="outline"
              className="text-destructive border-destructive hover:text-destructive hover:border-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
          <div className="sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gradient-button">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 sm:w-80">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 grid gap-3">
                  {!isSuperAdmin && (
                    <SheetClose asChild>
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={handleAdminDashboardClick}
                      >
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </Button>
                    </SheetClose>
                  )}
                  <SheetClose asChild>
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={handleSelectCompanyClick}
                    >
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Select Company
                    </Button>
                  </SheetClose>
                  {!isMedia && (
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleFilesAssetsClick}
                      >
                        <Folder className="h-4 w-4 mr-2" />
                        Files & Assets
                      </Button>
                    </SheetClose>
                  )}
                  <SheetClose asChild>
                    <Button
                      variant="outline"
                      className="w-full text-destructive border-destructive hover:text-destructive hover:border-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
}
