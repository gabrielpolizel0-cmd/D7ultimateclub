'use client';

import { useEffect } from 'react';
import { fbqTrack } from '@/lib/pixel';

interface Props {
  tournamentId: string;
  tournamentName?: string;
  entryFee?: number;
}

export default function TournamentPixelView({
  tournamentId,
  tournamentName,
  entryFee,
}: Props) {
  useEffect(() => {
    fbqTrack('ViewContent', {
      content_name: tournamentName || 'Torneio',
      content_ids: [tournamentId],
      content_type: 'tournament',
      value: entryFee,
      currency: 'BRL',
    });
  }, [tournamentId, tournamentName, entryFee]);

  return null;
}