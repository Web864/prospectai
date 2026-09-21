import {
  BarChart3,
  CalendarDays,
  FileSearch,
  Mail,
  MessageSquare,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import MetricCard from './MetricCard';
import { UsageCircle } from './UsageCircle';

interface DashboardStatsProps {
  analyses: number;
  leads: number;
  qualifiedOpportunities: number;
  analysesUsed: number;
  analysesLimit: number | null;
  contactedProspects: number;
  replies: number;
  meetings: number;
  wonClients: number;
}

export default function DashboardStats({
  analyses,
  leads,
  qualifiedOpportunities,
  analysesUsed,
  analysesLimit,
  contactedProspects,
  replies,
  meetings,
  wonClients,
}: DashboardStatsProps) {
  const usagePercentage =
    analysesLimit === null
      ? null
      : analysesLimit === 0
        ? 100
        : Math.round((analysesUsed / analysesLimit) * 100);

  return (
    <section className="dashboard-grid" aria-label="Workspace metrics">
      <MetricCard
        title="Analyses"
        value={analyses}
        subtitle="This billing period"
        icon={FileSearch}
        iconColor="#2475e8"
        graphColor="#83b7f5"
      />
      <MetricCard
        title="Leads"
        value={leads}
        subtitle="Saved prospects"
        icon={Users}
        iconColor="#078b7d"
        graphColor="#78cdbd"
      />
      <MetricCard
        title="opportunities"
        value={qualifiedOpportunities}
        subtitle="Based on your services"
        icon={Target}
        iconColor="#7447e8"
        graphColor="#ae98ed"
      />
      <MetricCard
        title="Usage"
        value={analysesUsed}
        subtitle={analysesLimit === null ? 'No fixed limit' : `of ${analysesLimit} analyses`}
        icon={BarChart3}
        iconColor="#e79a0a"
        visual={<UsageCircle value={usagePercentage} />}
      />
      <MetricCard
        title="Contacted"
        value={contactedProspects}
        subtitle="Prospects"
        icon={Mail}
        iconColor="#d93754"
        graphColor="#ee91a2"
      />
      <MetricCard
        title="Replies"
        value={replies}
        subtitle="Recorded replies"
        icon={MessageSquare}
        iconColor="#2475e8"
        graphColor="#83b7f5"
      />
      <MetricCard
        title="Meetings"
        value={meetings}
        subtitle="Booked"
        icon={CalendarDays}
        iconColor="#7447e8"
        graphColor="#ae98ed"
      />
      <MetricCard
        title="Won clients"
        value={wonClients}
        subtitle="Converted"
        icon={Trophy}
        iconColor="#059669"
        graphColor="#78cfaa"
      />
    </section>
  );
}
