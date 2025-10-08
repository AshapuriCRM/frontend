"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Users, Settings, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";

const adminCards = [
  {
    title: "All Employees",
    icon: Users,
    href: "/admin/all-employees",
    disabled: false,
    loading: false,
  },
  {
    title: "Setting",
    icon: Settings,
    href: "/admin/setting",
    disabled: false,
    loading: false,
  },
  {
    title: "Other",
    icon: MoreHorizontal,
    href: "/admin/other",
    disabled: true, // Example: disabled state
    loading: false,
  },
];

function AdminCard({
  title,
  icon: Icon,
  href,
  disabled,
  loading,
  selected,
  onClick,
}: any) {
  return (
    <motion.div
      whileHover={!disabled && !loading ? { y: -2, scale: 1.025 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="w-full h-full"
    >
      <button
        type="button"
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        tabIndex={disabled ? -1 : 0}
        onClick={onClick}
        className={cn(
          "group w-full h-full aspect-square max-w-[160px] min-w-[120px] min-h-[120px] max-h-[160px] flex flex-col items-center justify-center gap-2 rounded-xl border bg-card text-card-foreground shadow-md transition-all duration-200 outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "hover:bg-accent/60 hover:border-primary/60 hover:ring-2 hover:ring-primary/60",
          (selected || loading) && "ring-2 ring-primary border-primary",
          disabled && "opacity-50 pointer-events-none grayscale"
        )}
        style={{}}
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-accent p-3 transition-colors",
            selected || loading
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground",
            disabled && "bg-muted"
          )}
        >
          <Icon className="w-7 h-7" />
        </span>
        <span
          className={cn(
            "font-semibold text-sm",
            (selected || loading) && "text-primary"
          )}
        >
          {title}
        </span>
        {loading && (
          <span className="mt-1 text-xs text-muted-foreground">Loading...</span>
        )}
        {disabled && !loading && (
          <span className="mt-1 text-xs text-muted-foreground">
            Coming soon
          </span>
        )}
      </button>
    </motion.div>
  );
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [loadingCard, setLoadingCard] = useState<string | null>(null);

  const handleCardClick = (card: any) => {
    if (card.disabled || card.loading) return;
    setSelected(card.title);
    setLoadingCard(card.title);
    setTimeout(() => {
      router.push(card.href);
    }, 400); // Simulate loading
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col items-start justify-start bg-background px-4 py-8">
        <div className="w-full max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-left">Admin Dashboard</h1>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full justify-center items-start">
            {adminCards.map((card) => (
              <AdminCard
                key={card.title}
                title={card.title}
                icon={card.icon}
                href={card.href}
                disabled={card.disabled}
                loading={loadingCard === card.title}
                selected={selected === card.title}
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
