'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type AccessState = 'checking' | 'unauthorized' | 'not_admin' | 'admin';
type TeamSize = 3 | 4 | 5;

interface PlayerOption {
  id: string;
  riot_game_name: string;
  riot_tag_line: string;
  d7_points: number;
  d7_tier: string | null;
  d7_division: string | null;
}

interface PlayerRow {
  playerId: string | null;
  search: string;
  kills: string;
  deaths: string;
  assists: string;
  damageDealt: string;
  championName: string;
  team: 'A' | 'B';
}

const emptyRow = (team: 'A' | 'B'): PlayerRow => ({
  playerId: null,
  search: '',
  kills: '',
  deaths: '',
  assists: '',
  damageDealt: '',
  championName: '',
  team,
});

function buildRows(teamSize: TeamSize): PlayerRow[] {
  const rows: PlayerRow[] = [];
  for (let i = 0; i < teamSize; i++) rows.push(emptyRow('A'));
  for (let i = 0; i < teamSize; i++) rows.push(emptyRow('B'));
  return rows;
}

// ============================================
// FORMULA DE PONTOS
// ============================================
const POINTS_WIN = 18;
const POINTS_LOSS = -12;
const QUALIFICATION_MATCHES_REQUIRED = 10;
const QUALIFICATION_MULTIPLIER = 2;

function calculatePoints(
  win: boolean,
  kills: number,
  deaths: number,
  assists: number,
  damageDealt: number,
  durationSeconds: number,
  isQualification: boolean
): number {
  let points = win ? POINTS_WIN : POINTS_LOSS;

  const kda = deaths === 0 ? (kills + assists) : (kills + assists) / deaths;
  if (kda >= 6.0) points += 12;
  else if (kda >= 4.0) points += 8;
  else if (kda >= 2.5) points += 4;
  else if (kda >= 1.5) points += 0;
  else if (kda >= 0.8) points -= 3;
  else points -= 6;

  if (assists >= 20) points += 6;
  else if (assists >= 15) points += 3;

  const durationMinutes = durationSeconds / 60;
  if (durationMinutes >= 5) {
    const dpm = damageDealt / durationMinutes;
    if (dpm >= 2500) points += 8;
    else if (dpm >= 1800) points += 5;
    else if (dpm >= 1200) points += 2;
    else if (dpm >= 800) points += 0;
    else if (dpm >= 400) points -= 2;
    else points -= 4;
  }

  if (isQualification) points *= QUALIFICATION_MULTIPLIER;

  return points;
}

function computeTier(points: number): { tier: string; division: string | null } {
  if (points >= 3000) return { tier: 'ULTIMATE', division: null };
  if (points >= 2500) return { tier: 'MASTER', division: null };
  const thresholds = [
    { tier: 'BRONZE',   minPoints: 0    },
    { tier: 'SILVER',   minPoints: 500  },
    { tier: 'GOLD',     minPoints: 1000 },
    { tier: 'PLATINUM', minPoints: 1500 },
    { tier: 'DIAMOND',  minPoints: 2000 },
  ];
  const tierData = [...thresholds].reverse().find(t => points >= t.minPoints) || thresholds[0];
  const pointsInTier = points - tierData.minPoints;
  const divisionIndex = Math.floor(pointsInTier / 125);
  const divisions = ['IV', 'III', 'II', 'I'];
  return { tier: tierData.tier, division: divisions[Math.min(divisionIndex, 3)] };
}

export default function AdminPartidasPage() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>('checking');

  // Form state
  const [teamSize, setTeamSize] = useState<TeamSize>(5);
  const [rows, setRows] = useState<PlayerRow[]>(buildRows(5));
  const [winnerTeam, setWinnerTeam] = useState<'A' | 'B'>('A');
  const [durationMinutes, setDurationMinutes] = useState<string>('15');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [tournamentId, setTournamentId] = useState<string>('');
  const [tournaments, setTournaments] = useState<{id: string; name: string}[]>([]);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error'; text: string} | null>(null);
  const [searchResults, setSearchResults] = useState<Record<number, PlayerOption[]>>({});

  const [recentMatches, setRecentMatches] = useState<any[]>([]);

  // Quando muda tamanho do time, reseta as linhas
  function changeTeamSize(size: TeamSize) {
    setTeamSize(size);
    setRows(buildRows(size));
    setSearchResults({});
    setMessage(null);
  }

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAccess('unauthorized'); return; }
      const { data: player } = await supabase
        .from('players').select('is_admin').eq('auth_user_id', user.id).single();
      if (!player || !player.is_admin) { setAccess('not_admin'); return; }
      setAccess('admin');
    }
    checkAccess();
  }, []);

  useEffect(() => {
    if (access !== 'admin') return;
    async function loadInitial() {
      const { data: tours } = await supabase
        .from('tournaments').select('id, name').order('start_date', { ascending: false });
      if (tours) setTournaments(tours);
      const { data: recent } = await supabase
        .from('aram_matches')
        .select(`
          id, manual_match_group, played_at, result, kills, deaths, assists, kda,
          damage_dealt, points_change, manual_screenshot_url,
          players ( riot_game_name, riot_tag_line )
        `)
        .eq('was_manual', true)
        .order('played_at', { ascending: false })
        .limit(50);
      if (recent) setRecentMatches(recent);
    }
    loadInitial();
  }, [access]);

  async function searchPlayer(idx: number, query: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, search: query, playerId: null } : r));
    if (query.length < 2) { setSearchResults(prev => ({ ...prev, [idx]: [] })); return; }
    const { data } = await supabase
      .from('players')
      .select('id, riot_game_name, riot_tag_line, d7_points, d7_tier, d7_division')
      .ilike('riot_game_name', `%${query}%`).limit(8);
    setSearchResults(prev => ({ ...prev, [idx]: data || [] }));
  }

  function selectPlayer(idx: number, p: PlayerOption) {
    setRows(prev => prev.map((r, i) => i === idx
      ? { ...r, playerId: p.id, search: `${p.riot_game_name}#${p.riot_tag_line}` }
      : r
    ));
    setSearchResults(prev => ({ ...prev, [idx]: [] }));
  }

  function updateRow(idx: number, field: keyof PlayerRow, value: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function validate(): string | null {
    const dur = parseFloat(durationMinutes);
    if (isNaN(dur) || dur <= 0) return 'Duração inválida';

    const usedIds = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.playerId) return `Jogador #${i+1} não selecionado`;
      if (usedIds.has(r.playerId)) return `Jogador #${i+1} duplicado`;
      usedIds.add(r.playerId);
      const k = parseInt(r.kills), d = parseInt(r.deaths), a = parseInt(r.assists);
      const dmg = parseInt(r.damageDealt);
      if (isNaN(k) || k < 0) return `KILLS inválido no jogador #${i+1}`;
      if (isNaN(d) || d < 0) return `DEATHS inválido no jogador #${i+1}`;
      if (isNaN(a) || a < 0) return `ASSISTS inválido no jogador #${i+1}`;
      if (isNaN(dmg) || dmg < 0) return `Dano inválido no jogador #${i+1}`;
    }
    return null;
  }

  async function handleSubmit() {
    setMessage(null);
    const err = validate();
    if (err) { setMessage({ type: 'error', text: err }); return; }

    setSubmitting(true);
    try {
      let screenshotUrl: string | null = null;
      if (screenshot) {
        const fileName = `${Date.now()}_${screenshot.name.replace(/[^a-z0-9.]/gi, '_')}`;
        const { data: uploadData, error: uploadErr } = await supabase
          .storage.from('match-screenshots').upload(fileName, screenshot);
        if (uploadErr) throw new Error(`Erro no upload: ${uploadErr.message}`);
        const { data: urlData } = supabase.storage.from('match-screenshots').getPublicUrl(uploadData.path);
        screenshotUrl = urlData.publicUrl;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { data: adminPlayer } = await supabase
        .from('players').select('id').eq('auth_user_id', user!.id).single();

      const matchGroup = crypto.randomUUID();
      const playedAt = new Date().toISOString();
      const durationSeconds = Math.round(parseFloat(durationMinutes) * 60);

      const updates: any[] = [];

      for (const r of rows) {
        const k = parseInt(r.kills), d = parseInt(r.deaths), a = parseInt(r.assists);
        const dmg = parseInt(r.damageDealt);
        const won = r.team === winnerTeam;
        const kda = d === 0 ? (k + a) : (k + a) / d;

        const { data: player } = await supabase
          .from('players')
          .select('d7_points, qualification_matches_played, aram_total_wins, aram_total_losses')
          .eq('id', r.playerId).single();
        if (!player) throw new Error(`Jogador ${r.search} não encontrado`);

        const isQual = player.qualification_matches_played < QUALIFICATION_MATCHES_REQUIRED;
        const pointsChange = calculatePoints(won, k, d, a, dmg, durationSeconds, isQual);
        const newPoints = Math.max(0, player.d7_points + pointsChange);

        const newQualCount = isQual ? player.qualification_matches_played + 1 : player.qualification_matches_played;
        const stillQualifying = newQualCount < QUALIFICATION_MATCHES_REQUIRED;

        const { tier, division } = stillQualifying
          ? { tier: 'UNRANKED', division: null }
          : computeTier(newPoints);

        updates.push({
          playerId: r.playerId,
          matchRow: {
            player_id: r.playerId,
            riot_match_id: `manual_${matchGroup}_${r.playerId}`,
            queue_id: 9999,
            played_at: playedAt,
            duration_seconds: durationSeconds,
            champion_id: 0,
            champion_name: r.championName || 'Unknown',
            kills: k,
            deaths: d,
            assists: a,
            kda: parseFloat(kda.toFixed(2)),
            damage_dealt: dmg,
            damage_taken: 0,
            gold_earned: 0,
            result: won ? 'win' : 'loss',
            was_qualification: isQual,
            points_change: pointsChange,
            points_after: newPoints,
            was_manual: true,
            manual_screenshot_url: screenshotUrl,
            manual_match_group: matchGroup,
            manual_created_by: adminPlayer!.id,
            manual_tournament_id: tournamentId || null,
          },
          playerUpdate: {
            d7_points: newPoints,
            d7_tier: tier,
            d7_division: division,
            qualification_matches_played: newQualCount,
            aram_total_wins: won ? player.aram_total_wins + 1 : player.aram_total_wins,
            aram_total_losses: won ? player.aram_total_losses : player.aram_total_losses + 1,
            last_match_synced_at: playedAt,
          },
        });
      }

      const matchRows = updates.map(u => u.matchRow);
      const { error: insertErr } = await supabase.from('aram_matches').insert(matchRows);
      if (insertErr) throw new Error(`Erro ao salvar partidas: ${insertErr.message}`);

      for (const u of updates) {
        await supabase.from('players').update(u.playerUpdate).eq('id', u.playerId);
      }

      setMessage({ type: 'success', text: `✅ Partida salva! ${rows.length} jogadores atualizados.` });
      setRows(buildRows(teamSize));
      setScreenshot(null);
      setSearchResults({});

      const { data: recent } = await supabase
        .from('aram_matches')
        .select(`
          id, manual_match_group, played_at, result, kills, deaths, assists, kda,
          damage_dealt, points_change, manual_screenshot_url,
          players ( riot_game_name, riot_tag_line )
        `)
        .eq('was_manual', true).order('played_at', { ascending: false }).limit(50);
      if (recent) setRecentMatches(recent);
    } catch (e: any) {
      setMessage({ type: 'error', text: `❌ ${e.message}` });
    } finally {
      setSubmitting(false);
    }
  }

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
          <h1 className="text-2xl font-black mb-2">Acesso restrito</h1>
          <button onClick={() => router.push('/login')} className="mt-4 px-6 py-3 bg-accent text-bg font-bold rounded">Fazer login</button>
        </div>
      </div>
    );
  }
  if (access === 'not_admin') {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-8">
        <div className="max-w-md text-center bg-bg-card border border-border rounded-lg p-8">
          <p className="text-5xl mb-4">🚫</p>
          <h1 className="text-2xl font-black mb-2">Acesso negado</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="container-custom py-8 md:py-12 max-w-5xl">
        <button onClick={() => router.push('/painel')} className="text-text-soft hover:text-accent text-sm mb-3">
          ← Voltar pro painel
        </button>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-black">Registrar Partida</h1>
          <span className="px-2 py-0.5 bg-accent/20 text-accent text-[10px] font-bold rounded uppercase">👑 Admin</span>
        </div>
        <p className="text-text-soft mb-2">
          Cadastra uma partida ARAM manualmente.
        </p>
        <p className="text-xs text-text-soft mb-8">
          💡 Pontos = base (+18W/-12L) + bônus KDA + bônus assists + bônus DPM. Primeiras 10 partidas valem 2x.
        </p>

        {/* Tamanho dos times */}
        <div className="bg-bg-card border border-border rounded-lg p-5 mb-6">
          <p className="text-sm font-bold mb-3">👥 Tamanho dos times</p>
          <div className="flex gap-2 flex-wrap">
            {([3, 4, 5] as TeamSize[]).map(size => (
              <button
                key={size}
                onClick={() => changeTeamSize(size)}
                className={`px-4 py-2 rounded font-bold text-sm ${
                  teamSize === size
                    ? 'bg-accent text-bg'
                    : 'bg-bg border border-border hover:border-accent'
                }`}
              >
                {size}v{size} ({size * 2} jogadores)
              </button>
            ))}
          </div>
          <p className="text-xs text-text-soft mt-3">
            💡 ARAM padrão é 5v5. Use 3v3 ou 4v4 só pra partidas em sala custom.
          </p>
        </div>

        {/* Screenshot */}
        <div className="bg-bg-card border border-border rounded-lg p-5 mb-6">
          <p className="text-sm font-bold mb-3">📸 Screenshot da partida (opcional mas recomendado)</p>
          <input
            type="file"
            accept="image/*"
            onChange={e => setScreenshot(e.target.files?.[0] || null)}
            className="text-sm text-text-soft file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-accent file:text-bg file:font-bold file:cursor-pointer"
          />
          {screenshot && (<p className="text-xs text-text-soft mt-2">📎 {screenshot.name}</p>)}
        </div>

        {/* Duração */}
        <div className="bg-bg-card border border-border rounded-lg p-5 mb-6">
          <p className="text-sm font-bold mb-3">⏱️ Duração da partida (em minutos)</p>
          <input
            type="number"
            step="0.5"
            min="0"
            value={durationMinutes}
            onChange={e => setDurationMinutes(e.target.value)}
            placeholder="Ex: 18.5"
            className="w-32 px-3 py-2 bg-bg border border-border rounded text-sm"
          />
          <p className="text-xs text-text-soft mt-2">
            ⚠️ Importante: DPM (dano/minuto) depende disso. Vale pra todos os jogadores.
          </p>
        </div>

        {/* Torneio */}
        <div className="bg-bg-card border border-border rounded-lg p-5 mb-6">
          <p className="text-sm font-bold mb-3">🏆 Torneio relacionado (opcional)</p>
          <select
            value={tournamentId}
            onChange={e => setTournamentId(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-border rounded text-sm"
          >
            <option value="">Nenhum (partida casual)</option>
            {tournaments.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select>
        </div>

        {/* Vencedor */}
        <div className="bg-bg-card border border-border rounded-lg p-5 mb-6">
          <p className="text-sm font-bold mb-3">🏆 Time vencedor</p>
          <div className="flex gap-2">
            <button onClick={() => setWinnerTeam('A')}
              className={`px-4 py-2 rounded font-bold ${winnerTeam === 'A' ? 'bg-accent text-bg' : 'bg-bg border border-border'}`}>
              Time A venceu
            </button>
            <button onClick={() => setWinnerTeam('B')}
              className={`px-4 py-2 rounded font-bold ${winnerTeam === 'B' ? 'bg-accent text-bg' : 'bg-bg border border-border'}`}>
              Time B venceu
            </button>
          </div>
        </div>

        {/* Jogadores */}
        {(['A', 'B'] as const).map(team => (
          <div key={team} className={`mb-6 ${team === winnerTeam ? 'border-accent' : 'border-border'} bg-bg-card border-2 rounded-lg p-5`}>
            <p className="text-lg font-bold mb-4">
              Time {team} {team === winnerTeam ? '👑 Vencedor' : ''} <span className="text-sm text-text-soft font-normal">({teamSize} jogadores)</span>
            </p>
            <div className="space-y-3">
              {rows.map((row, idx) => {
                if (row.team !== team) return null;
                const results = searchResults[idx] || [];
                return (
                  <div key={idx} className="bg-bg border border-border rounded p-3">
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1.2fr_50px_50px_50px_90px] gap-2 items-start">
                      <div className="relative">
                        <input type="text" value={row.search}
                          onChange={e => searchPlayer(idx, e.target.value)}
                          placeholder={`Jogador ${idx+1}`}
                          className="w-full px-3 py-2 bg-bg-card border border-border rounded text-sm" />
                        {row.playerId && (<span className="absolute right-2 top-2 text-accent text-xs">✓</span>)}
                        {results.length > 0 && !row.playerId && (
                          <div className="absolute z-10 left-0 right-0 mt-1 bg-bg-card border border-border rounded shadow-lg max-h-64 overflow-y-auto">
                            {results.map(p => (
                              <button key={p.id} onClick={() => selectPlayer(idx, p)}
                                className="w-full text-left px-3 py-2 hover:bg-bg text-sm border-b border-border last:border-b-0">
                                <p className="font-bold">{p.riot_game_name}#{p.riot_tag_line}</p>
                                <p className="text-xs text-text-soft">
                                  {p.d7_tier || 'UNRANKED'} {p.d7_division || ''} • {p.d7_points} pts
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <input type="text" value={row.championName}
                        onChange={e => updateRow(idx, 'championName', e.target.value)}
                        placeholder="Campeão"
                        className="px-3 py-2 bg-bg-card border border-border rounded text-sm" />

                      <input type="number" min="0" value={row.kills}
                        onChange={e => updateRow(idx, 'kills', e.target.value)}
                        placeholder="K"
                        className="px-2 py-2 bg-bg-card border border-border rounded text-sm text-center" />
                      <input type="number" min="0" value={row.deaths}
                        onChange={e => updateRow(idx, 'deaths', e.target.value)}
                        placeholder="D"
                        className="px-2 py-2 bg-bg-card border border-border rounded text-sm text-center" />
                      <input type="number" min="0" value={row.assists}
                        onChange={e => updateRow(idx, 'assists', e.target.value)}
                        placeholder="A"
                        className="px-2 py-2 bg-bg-card border border-border rounded text-sm text-center" />

                      <input type="number" min="0" value={row.damageDealt}
                        onChange={e => updateRow(idx, 'damageDealt', e.target.value)}
                        placeholder="Dano"
                        className="px-2 py-2 bg-bg-card border border-border rounded text-sm text-center" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {message && (
          <div className={`p-4 rounded-lg mb-4 text-sm ${
            message.type === 'success'
              ? 'bg-accent/10 border border-accent/30 text-accent'
              : 'bg-danger/10 border border-danger/30 text-danger'
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex justify-end mb-12">
          <button onClick={handleSubmit} disabled={submitting}
            className="px-8 py-3 bg-accent hover:bg-accent-deep text-bg font-black rounded transition-colors disabled:opacity-50 text-lg">
            {submitting ? 'Salvando...' : `💾 Salvar partida (${rows.length} jogadores)`}
          </button>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">📋 Últimas partidas registradas</h2>
          {recentMatches.length === 0 ? (
            <div className="bg-bg-card border border-border rounded-lg p-8 text-center text-text-soft">
              Nenhuma partida manual cadastrada ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(
                recentMatches.reduce((acc: any, m) => {
                  acc[m.manual_match_group] = acc[m.manual_match_group] || [];
                  acc[m.manual_match_group].push(m);
                  return acc;
                }, {})
              ).map(([group, matches]: [string, any]) => {
                const m0 = matches[0];
                return (
                  <details key={group} className="bg-bg-card border border-border rounded-lg p-4">
                    <summary className="cursor-pointer text-sm font-bold flex items-center gap-3">
                      <span>📅 {new Date(m0.played_at).toLocaleString('pt-BR')}</span>
                      <span className="text-text-soft">· {matches.length} jogadores</span>
                      {m0.manual_screenshot_url && (
                        <a href={m0.manual_screenshot_url} target="_blank" rel="noopener" className="text-accent text-xs">
                          📸 Ver print
                        </a>
                      )}
                    </summary>
                    <div className="mt-3 space-y-1 text-xs">
                      {matches.map((m: any) => {
                        const p = Array.isArray(m.players) ? m.players[0] : m.players;
                        return (
                          <div key={m.id} className="flex justify-between border-b border-border py-1">
                            <span className={m.result === 'win' ? 'text-accent' : 'text-text-soft'}>
                              {m.result === 'win' ? '✓' : '✗'} {p?.riot_game_name}#{p?.riot_tag_line}
                            </span>
                            <span className="font-mono">
                              {m.kills}/{m.deaths}/{m.assists} · {m.damage_dealt} dmg ·
                              <span className={m.points_change >= 0 ? 'text-accent' : 'text-danger'}>
                                {' '}{m.points_change >= 0 ? '+' : ''}{m.points_change} pts
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}