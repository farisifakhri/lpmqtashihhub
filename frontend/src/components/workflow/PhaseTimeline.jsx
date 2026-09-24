import React from 'react';
import { WorkflowTimeline } from '@/components/common/WorkflowTimeline';
import { STATUS_DEFINITIONS } from '@/lib/workflow-view-model';

// Compatibility adapter for callers that pass a phase rather than a registration status.
// Both interfaces render the same timeline implementation and use the same status model.
const statusForPhase = Object.entries(STATUS_DEFINITIONS).reduce((result, [status, definition]) => {
  if (!result[definition.phase]) result[definition.phase] = status;
  return result;
}, {});

export const PhaseTimeline = ({ currentPhase = 'REGISTRATION', substatusText, history = [] }) => (
  <div className="space-y-2">
    <WorkflowTimeline currentStatus={statusForPhase[currentPhase] || 'DRAFT'} statusHistories={history} />
    {substatusText && <p className="text-xs text-slate-600">{substatusText}</p>}
  </div>
);

export default PhaseTimeline;
