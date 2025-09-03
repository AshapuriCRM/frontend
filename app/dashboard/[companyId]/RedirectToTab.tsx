'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RedirectToTab({
  companyId,
  tab,
}: {
  companyId: string;
  tab: string;
}) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/dashboard/${companyId}/${tab}`);
  }, [companyId, tab, router]);

  return null;
}
