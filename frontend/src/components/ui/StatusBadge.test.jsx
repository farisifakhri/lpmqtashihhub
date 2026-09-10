import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';
import { TOKENS } from '@/app/tokens';

describe('StatusBadge Component (LPMQ Official State Machine)', () => {
  const allStatuses = [
    'DRAFT',
    'READY_FOR_VERIFICATION',
    'IN_VERIFICATION',
    'REVISION_REQUIRED',
    'WAITING_VERIFICATION_APPROVAL',
    'AWAITING_PAYMENT',
    'PAYMENT_VERIFICATION',
    'WAITING_DISTRIBUTION',
    'TASHIH_IN_PROGRESS',
    'READY_FOR_STT',
    'STT_ISSUED',
    'DOCUMENTATION_IN_PROGRESS',
    'DOCUMENTATION',
    'COMPLETED',
    'CANCELLED',
  ];

  it.each(allStatuses)(
    'should render accurate official label for status %s',
    (status) => {
      render(<StatusBadge status={status} />);
      const expectedLabel = TOKENS.registrationStatus[status].label;
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    }
  );

  it('should render icon by default for accessibility (WCAG AA)', () => {
    const { container } = render(<StatusBadge status="TASHIH_IN_PROGRESS" />);
    const svgIcon = container.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
  });

  it('should allow hiding icon when requested', () => {
    const { container } = render(
      <StatusBadge status="COMPLETED" showIcon={false} />
    );
    const svgIcon = container.querySelector('svg');
    expect(svgIcon).toBeNull();
    expect(screen.getByText('Selesai (Surat Terbit)')).toBeInTheDocument();
  });

  it('should include description in title attribute for screen readers / tooltips', () => {
    render(<StatusBadge status="REVISION_REQUIRED" />);
    const badge = screen.getByTitle(TOKENS.registrationStatus.REVISION_REQUIRED.description);
    expect(badge).toBeInTheDocument();
  });
});
