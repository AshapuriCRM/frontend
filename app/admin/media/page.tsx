"use client";

import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AnimatedPage } from "@/components/ui/animated-page";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Card } from "@/components/ui/card";
import { Folder } from "lucide-react";

const FOLDERS = [
  {
    name: "Invoices",
    description: "All invoice files and documents.",
    icon: <Folder className="h-8 w-8 text-primary" />,
    href: "/admin/media/Invoices",
  },
  {
    name: "Salary Slips",
    description: "All generated salary slip files.",
    icon: <Folder className="h-8 w-8 text-primary" />,
    href: "/admin/media/SalarySlips",
  },
];

export default function MediaFoldersPage() {
  const router = useRouter();

  return (
    <ProtectedRoute>
      <AnimatedPage className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Media</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-3xl font-bold mb-2 mt-6">Media Folders</h1>
          <p className="text-muted-foreground mb-8">
            Browse all folders containing your media files.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {FOLDERS.map((folder) => (
              <button
                key={folder.name}
                onClick={() => router.push(folder.href)}
                className="group w-full focus:outline-none"
                aria-label={`Open ${folder.name} folder`}
              >
                <Card className="aspect-square flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card shadow-sm transition-all hover:bg-accent hover:border-primary/60 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/70 active:scale-[0.98] disabled:opacity-50">
                  {folder.icon}
                  <span className="mt-2 text-xs text-center truncate max-w-[90%] font-medium text-foreground">
                    {folder.name}
                  </span>
                </Card>
              </button>
            ))}
          </div>
        </div>
      </AnimatedPage>
    </ProtectedRoute>
  );
}
