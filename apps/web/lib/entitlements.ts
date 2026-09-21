import { calculateReservedUsage } from '@prospectai/analysis';
import { loadGuestEnvironment } from '@prospectai/config';
import { prisma } from '@prospectai/database';
import type { PlanCode } from '@prospectai/types';

export function currentUsagePeriod(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export async function organizationEntitlement(organizationId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      organizationId,
      status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
    },
    orderBy: { updatedAt: 'desc' },
  });
  const plan = (
    subscription?.planCode === 'pro' || subscription?.planCode === 'agency'
      ? subscription.planCode
      : 'free'
  ) as PlanCode;
  const environment = loadGuestEnvironment();
  const limit =
    plan === 'agency'
      ? environment.AGENCY_MONTHLY_ANALYSIS_LIMIT
      : plan === 'pro'
        ? environment.PRO_MONTHLY_ANALYSIS_LIMIT
        : environment.FREE_MONTHLY_ANALYSIS_LIMIT;
  const period = currentUsagePeriod();
  const grouped = await prisma.usageLedger.groupBy({
    by: ['operation'],
    where: {
      organizationId,
      feature: 'analysis',
      createdAt: { gte: period.start, lt: period.end },
    },
    _sum: { quantity: true },
  });
  const used = Math.max(
    0,
    calculateReservedUsage(
      grouped.map((entry) => ({
        operation: entry.operation,
        quantity: entry._sum.quantity ?? 0,
      })),
    ),
  );
  return {
    plan,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    quotaReached: used >= limit,
    periodStart: period.start,
    periodEnd: period.end,
    subscription,
  };
}
