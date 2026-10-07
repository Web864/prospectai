import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CSSProperties } from 'react';
import { MiniTrend } from './MiniTrend';

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
  iconColor = '#078b7d',
  graphColor = '#8dd8c9',
  visual,
}: MetricCardProps) {
  const iconStyle: CSSProperties & { '--metric-icon-color': string } = {
    '--metric-icon-color': iconColor,
  };

  return (
    <article className="metric-card">
      <div className="metric-card-top">
        <strong className="metric-card-value">{value}</strong>
        <span className="metric-card-icon" style={iconStyle} aria-hidden="true">
          <Icon size={21} strokeWidth={1.9} />
        </span>
      </div>

      <div className="metric-card-copy">
        <div className="">
          <span className="metric-card-title">{title}</span>
          <br />
          <small>{subtitle}</small>
        </div>
        {visual ?? <MiniTrend color={graphColor} />}
      </div>
    </article>
  );
}
