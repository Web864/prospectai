import { AppError } from '@prospectai/shared';
import { aiOpportunitySchema } from '@prospectai/validation';

export interface OpportunityAiProvider {
  generateOpportunity(input: {
    businessContext: string;
    findings: ReadonlyArray<{ id: string; title: string; evidence: string }>;
  }): Promise<unknown>;
}

export async function generateValidatedOpportunity(
  provider: OpportunityAiProvider,
  input: Parameters<OpportunityAiProvider['generateOpportunity']>[0],
) {
  const output = await provider.generateOpportunity(input);
  const result = aiOpportunitySchema.safeParse(output);
  if (!result.success)
    throw new AppError(
      'EXTERNAL_SERVICE_ERROR',
      'AI provider returned an invalid structured response.',
      502,
    );
  const knownFindingIds = new Set(input.findings.map((finding) => finding.id));
  if (
    result.data.opportunities.some((opportunity) =>
      opportunity.findingIds.some((id) => !knownFindingIds.has(id)),
    )
  ) {
    throw new AppError(
      'EXTERNAL_SERVICE_ERROR',
      'AI provider referenced unsupported evidence.',
      502,
    );
  }
  return result.data;
}

export class UnconfiguredAiProvider implements OpportunityAiProvider {
  async generateOpportunity(): Promise<never> {
    throw new AppError('ANALYSIS_UNAVAILABLE', 'AI analysis is not configured.', 503);
  }
}
