import RedirectToTab from './RedirectToTab';

interface DashboardPageProps {
  params: { companyId: string };
}

// Required for static export
export async function generateStaticParams() {
  return [
    { companyId: '1' },
    { companyId: '2' },
    { companyId: '3' },
  ];
}

export default function DashboardPage({ params }: DashboardPageProps) {
  return <RedirectToTab companyId={params.companyId} tab="overview" />;
}
