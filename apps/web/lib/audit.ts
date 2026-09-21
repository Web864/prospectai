import { prisma } from '@prospectai/database';

export async function writeAudit(input: {
  action: string;
  resourceType: string;
  resourceId?: string;
  organizationId?: string;
  actorUserId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      resourceType: input.resourceType,
      ...(input.resourceId ? { resourceId: input.resourceId } : {}),
      ...(input.organizationId ? { organization: { connect: { id: input.organizationId } } } : {}),
      ...(input.actorUserId ? { actor: { connect: { id: input.actorUserId } } } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
  });
}
