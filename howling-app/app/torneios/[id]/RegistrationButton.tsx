'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Props {
  tournamentId: string;
  isFull: boolean;
}

export default function RegistrationButton({ tournamentId, isFull }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    async function checkStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      // Acha o player do usuário
      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!player) {
        setError('Sua conta não está vinculada a um Riot ID. Refaça o cadastro.');
        setLoading(false);
        return;
      }

      setPlayerId(player.id);

      // Verifica se já tá inscrito
      const { data: registration } = await supabase
        .from('registrations')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('player_id', player.id)
        .maybeSingle();

      if (registration) {
        setIsRegistered(true);
        setRegistrationId(registration.id);
      }

      setLoading(false);
    }

    checkStatus();
  }, [tournamentId]);

  async function handleRegister() {
    if (!playerId) return;
    
    setSubmitting(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('registrations')
      .insert({
        tournament_id: tournamentId,
        player_id: playerId,
        status: 'confirmed',
      })
      .select('id')
      .single();

    if (insertError) {
      setError(`Erro ao inscrever: ${insertError.message}`);
      setSubmitting(false);
      return;
    }

    setIsRegistered(true);
    setRegistrationId(data.id);
    setSubmitting(false);
    router.refresh();
  }

  async function handleCancel() {
    if (!registrationId) return;
    
    if (!confirm('Tem certeza que quer cancelar sua inscrição?')) return;

    setSubmitting(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from('registrations')
      .delete()
      .eq('id', registrationId);

    if (deleteError) {
      setError(`Erro ao cancelar: ${deleteError.message}`);
      setSubmitting(false);
      return;
    }

    setIsRegistered(false);
    setRegistrationId(null);
    setSubmitting(false);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="h-14 bg-gray-900 rounded animate-pulse"></div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="p-6 bg-gray-900 border border-gray-800 rounded-lg text-center">
        <p className="text-gray-400 mb-4">Você precisa estar logado para se inscrever no torneio.</p>
        <div className="flex gap-2 justify-center">
          <a href="/login" className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded transition-colors">
            Entrar
          </a>
          <a href="/cadastro" className="px-6 py-2 border border-gray-700 hover:border-gray-500 rounded transition-colors">
            Criar conta
          </a>
        </div>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="p-6 bg-emerald-900/20 border border-emerald-700 rounded-lg flex items-center justify-between">
        <div>
          <p className="text-emerald-400 font-bold text-lg">✅ Você está inscrito!</p>
          <p className="text-sm text-gray-400">Boa sorte no torneio!</p>
        </div>
        <button
          onClick={handleCancel}
          disabled={submitting}
          className="px-4 py-2 text-sm border border-red-700 text-red-400 hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
        >
          {submitting ? 'Cancelando...' : 'Cancelar inscrição'}
        </button>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="p-6 bg-red-900/20 border border-red-700 rounded-lg text-center">
        <p className="text-red-400 font-bold">🔒 Torneio LOTADO</p>
        <p className="text-sm text-gray-400 mt-1">Todas as vagas foram preenchidas.</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleRegister}
        disabled={submitting}
        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 text-black font-bold text-lg rounded-lg transition-colors"
      >
        {submitting ? 'Inscrevendo...' : '🎮 Inscrever-se no torneio'}
      </button>
      {error && (
        <div className="mt-3 p-3 bg-red-900/50 border border-red-700 rounded text-sm">
          ❌ {error}
        </div>
      )}
    </div>
  );
}