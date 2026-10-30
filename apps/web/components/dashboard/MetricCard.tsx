import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { V3Stat } from '../workspace-v3';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconColor?: string;
  graphColor?: string;
  visual?: ReactNode;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  visual,
}: MetricCardProps) {
  return <V3Stat title={title} value={value} note={subtitle} icon={Icon} visual={visual} />;
}
