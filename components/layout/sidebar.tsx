'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Receipt,
  FolderOpen,
  Settings,
  Users,
  Menu,
  X,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface SidebarProps {
  companyId: string;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/overview',
    icon: BarChart3,
  },
  {
    name: 'Invoice',
    href: '/invoice',
    icon: FileText,
  },
  {
    name: 'Salary Slip',
    href: '/salary',
    icon: Receipt,
  },
  {
    name: 'Documents',
    href: '/documents',
    icon: FolderOpen,
  },
  {
    name: 'GST/ESIC',
    href: '/categories',
    icon: Settings,
  },
  {
    name: 'Employees',
    href: '/employees',
    icon: Users,
  },
];

export function Sidebar({ companyId }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Company Header - matches navbar height */}
      <div className="h-16 px-6 border-b flex items-center">
        <div className="flex items-center gap-3">
          {/* Company Logo Image */}
          <div className="flex-shrink-0">
            <Image
              src="/images/logo.jpg"
              alt="Ashapuri Security Logo"
              width={64}
              height={64}
              className="w-16 h-16 rounded-lg object-contain"
              priority
            />
          </div>
          {/* Company Name */}
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight">Ashapuri</span>
            <span className="text-sm text-muted-foreground leading-tight">Security</span>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 py-6">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const href = `/dashboard/${companyId}${item.href}`;
            const isActive = pathname === href;
            
            return (
              <Link key={item.name} href={href}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  className={cn(
                    'w-full justify-start h-10',
                    isActive && 'bg-primary text-primary-foreground shadow-sm'
                  )}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <item.icon className="h-4 w-4 mr-3" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-card border-r">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r lg:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
