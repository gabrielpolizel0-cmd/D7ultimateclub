'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type AccessState = 'checking' | 'unauthorized' | 'has_team' | 'ready';

export default function CriarTimePage() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>('checking');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [existingTeamId, setExistingTeamId] = useState<string | null>(null);

  // Form
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [checkingName, setCheckingName] = useState(false);

  // Verifica auth + se já tem time
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccess('unauthorized');
        return;
      }

      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!player) {
        setAccess('unauthorized');
        return;
      }

      setPlayerId(player.id);

      // Verifica se o player já está em algum time
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('player_id', player.id)
        .maybeSingle();

      if (membership) {
        setExistingTeamId(membership.team_id);
        setAccess('has_team');
        return;
      }

      setAccess('ready');
    }
    check();
  }, []);

  // Checa disponibilidade do nome (com debounce simples)
  useEffect(() => {
    if (name.trim().length < 3) {
      setNameAvailable(null);
      return;
    }

    setCheckingName(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('teams')
        .select('id')
        .ilike('name', name.trim())
        .maybeSingle();
      setNameAvailable(!data);
      setCheckingName(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [name]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      setError('Nome do time precisa ter no mínimo 3 caracteres');
      return;
    }
    if (trimmedName.length > 40) {
      setError('Nome do time pode ter no máximo 40 caracteres');
      return;
    }
    if (nameAvailable === false) {
      setError('Esse nome de time já está em uso. Escolhe outro.');
      return;
    }
    if (tag.trim().length > 6) {
      setError('Tag pode ter no máximo 6 caracteres');
      return;
    }

    if (!playerId) {
      setError('Erro: jogador não identificado');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Cria o time
      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .insert({
          name: trimmedName,
          tag: tag.trim() || null,
          description: description.trim() || null,
          logo_url: logoUrl.trim() || null,
          captain_id: playerId,
        })
        .select('id')
        .single();

      if (teamErr) {
        if (teamErr.message.includes('unique') || teamErr.message.includes('duplicate')) {
          throw new Error('Esse nome de time já está em uso. Escolhe outro.');
        }
        throw new Error(teamErr.message);
      }

      // 2. Adiciona o capitão como membro
      const { error: memberErr } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          player_id: playerId,
          is_captain: true,
        });

      if (memberErr) {
        // Rollback: deleta o time se falhar adicionar membro
        await supabase.from('teams').delete().eq('id', team.id);
        throw new Error(`Erro ao adicionar capitão: ${memberErr.message}`);
      }

      // Sucesso → redireciona pra página do time
      router.push(`/times/${team.id}`);
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  // ===== Estados de acesso =====
  if (access === 'checking') {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-border border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (access === 'unauthorized') {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-8">
        <div className="max-w-md text-center bg-bg-card border border-border rounded-lg p-8">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-2xl font-black mb-2">Faça login pra criar um time</h1>
          <p className="text-text-soft mb-6">Você precisa estar cadastrado no D7 pra criar ou entrar em um time.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-accent hover:bg-accent-deep text-bg font-bold rounded transition-colors"
          >
            Fazer login
          </button>
        </div>
      </div>
    );
  }

  if (access === 'has_team') {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-8">
        <div className="max-w-md text-center bg-bg-card border border-border rounded-lg p-8">
          <p className="text-5xl mb-4">⚠️</p>
          <h1 className="text-2xl font-black mb-2">Você já está em um time</h1>
          <p className="text-text-soft mb-6">
            Um jogador só pode estar em 1 time por vez. Saia do time atual pra criar ou entrar em outro.
          </p>
          <button
            onClick={() => router.push(`/times/${existingTeamId}`)}
            className="px-6 py-3 bg-accent hover:bg-accent-deep text-bg font-bold rounded transition-colors"
          >
            Ver meu time
          </button>
        </div>
      </div>
    );
  }

  // ===== Form =====
  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="container-custom py-8 md:py-12 max-w-2xl">
        <button
          onClick={() => router.push('/times')}
          className="text-text-soft hover:text-accent text-sm mb-3"
        >
          ← Voltar pra lista de times
        </button>
        <h1 className="text-3xl md:text-4xl font-black mb-2">⚔️ Criar meu time</h1>
        <p className="text-text-soft mb-8">
          Você será o capitão automaticamente. Depois pode convidar até 9 jogadores (total: 10).
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nome */}
          <div className="bg-bg-card border border-border rounded-lg p-5">
            <label className="block text-sm font-bold mb-2">
              Nome do time <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Os Magrelos"
              maxLength={40}
              className="w-full px-4 py-3 bg-bg border border-border rounded text-base focus:border-accent outline-none"
              required
            />
            <div className="flex justify-between items-center mt-2 text-xs">
              <div>
                {checkingName && <span className="text-text-soft">Verificando...</span>}
                {!checkingName && nameAvailable === true && <span className="text-accent">✓ Nome disponível</span>}
                {!checkingName && nameAvailable === false && <span className="text-danger">✗ Nome já em uso</span>}
              </div>
              <span className="text-text-soft">{name.length}/40</span>
            </div>
          </div>

          {/* Tag */}
          <div className="bg-bg-card border border-border rounded-lg p-5">
            <label className="block text-sm font-bold mb-2">
              Tag (sigla) <span className="text-text-soft font-normal">— opcional</span>
            </label>
            <input
              type="text"
              value={tag}
              onChange={e => setTag(e.target.value.toUpperCase())}
              placeholder="Ex: MGR"
              maxLength={6}
              className="w-full px-4 py-3 bg-bg border border-border rounded text-base font-mono focus:border-accent outline-none"
            />
            <p className="text-xs text-text-soft mt-2">
              Até 6 caracteres. Aparece ao lado do nome (ex: &quot;Os Magrelos [MGR]&quot;).
            </p>
          </div>

          {/* Descrição */}
          <div className="bg-bg-card border border-border rounded-lg p-5">
            <label className="block text-sm font-bold mb-2">
              Descrição <span className="text-text-soft font-normal">— opcional</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Conte um pouco sobre o time, estilo de jogo, etc."
              maxLength={300}
              rows={3}
              className="w-full px-4 py-3 bg-bg border border-border rounded text-base focus:border-accent outline-none resize-none"
            />
            <p className="text-xs text-text-soft mt-2 text-right">{description.length}/300</p>
          </div>

          {/* Logo */}
          <div className="bg-bg-card border border-border rounded-lg p-5">
            <label className="block text-sm font-bold mb-2">
              URL do logo <span className="text-text-soft font-normal">— opcional</span>
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 bg-bg border border-border rounded text-base focus:border-accent outline-none"
            />
            <p className="text-xs text-text-soft mt-2">
              Link direto pra imagem (PNG/JPG). Suba seu logo no Imgur ou Discord e cola o link aqui.
            </p>
            {logoUrl && (
              <div className="mt-3 flex items-center gap-3">
                <div className="w-16 h-16 rounded bg-bg border border-border overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Preview" className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
                <span className="text-xs text-text-soft">Preview</span>
              </div>
            )}
          </div>

          {/* Erro */}
          {error && (
            <div className="p-4 bg-danger/10 border border-danger/30 text-danger rounded text-sm">
              ❌ {error}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => router.push('/times')}
              className="px-6 py-3 bg-bg-card border border-border hover:border-accent text-text-soft hover:text-accent font-bold rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || checkingName || nameAvailable === false}
              className="px-8 py-3 bg-accent hover:bg-accent-deep text-bg font-black rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Criando...' : '⚔️ Criar time'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}