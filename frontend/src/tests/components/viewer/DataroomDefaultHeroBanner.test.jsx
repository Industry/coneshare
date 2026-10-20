import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataroomDefaultHeroBanner } from '../../../components/viewer/DataroomDefaultHeroBanner';
import '../../../i18n';

describe('DataroomDefaultHeroBanner', () => {
  it('renders dataroom title, share ID, and default description', () => {
    render(
      <DataroomDefaultHeroBanner
        dataroomName="Acme Enterprise Dataroom"
        dataroomId="VR-8492"
      />
    );

    expect(screen.getByText('Acme Enterprise Dataroom')).toBeInTheDocument();
    expect(screen.getByText(/Share ID #VR-8492/i)).toBeInTheDocument();
    expect(screen.getByText(/RESTRICTED CONFIDENTIAL/i)).toBeInTheDocument();
  });

  it('renders visitor mode pill when hasViewSession is true', () => {
    render(
      <DataroomDefaultHeroBanner
        dataroomName="Acme Dataroom"
        hasViewSession={true}
      />
    );

    expect(screen.getByText(/Visitor Mode/i)).toBeInTheDocument();
  });

  it('renders watermark and NDA badges when enabled', () => {
    render(
      <DataroomDefaultHeroBanner
        dataroomName="Acme Dataroom"
        isWatermarked={true}
        isNdaProtected={true}
      />
    );

    expect(screen.getByTestId('hero-watermark-badge')).toBeInTheDocument();
    expect(screen.getByTestId('hero-nda-badge')).toBeInTheDocument();
  });
});
