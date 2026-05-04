'use client';

import { useState } from 'react';

export default function TestePage() {
  const [riotId, setRiotId] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function buscar() {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      // Separa "Faker#KR1" em ["Faker", "KR1"]
      const [gameName, tagLine] = riotId.split('#');
      if (!gameName || !tagLine) {
        throw new Error('Formato inválido. Use: NomeDoJogador#TAG');
      }

      const res = await fetch(`/api/player?gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}`);
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }

      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">🧪 Página de Teste — Riot API</h1>
      
      <div className="max-w-xl">
        <p className="mb-2 text-gray-400">Digita um Riot ID (ex: Faker#KR1):</p>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
            placeholder="NomeDoJogador#TAG"
            className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
          />
          <button
            onClick={buscar}
            disabled={loading || !riotId}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 rounded font-bold"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded">
            <p className="font-bold">❌ Erro:</p>
            <pre className="text-sm mt-2 whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {data && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-gray-900 border border-gray-700 rounded">
              <h2 className="font-bold text-emerald-400 mb-2">📋 Conta Riot</h2>
              <p>Nome: {data.account.gameName}#{data.account.tagLine}</p>
              <p className="text-xs text-gray-500 mt-1">PUUID: {data.account.puuid}</p>
            </div>

            <div className="p-4 bg-gray-900 border border-gray-700 rounded">
              <h2 className="font-bold text-emerald-400 mb-2">🎮 Summoner</h2>
              <p>Level: {data.summoner.summonerLevel}</p>
              <p>Ícone ID: {data.summoner.profileIconId}</p>
            </div>

            <div className="p-4 bg-gray-900 border border-gray-700 rounded">
              <h2 className="font-bold text-emerald-400 mb-2">🏆 Ranked</h2>
              {data.ranked.length === 0 ? (
                <p className="text-gray-500">Sem ranqueadas nesta temporada</p>
              ) : (
                data.ranked.map((entry: any) => (
                  <div key={entry.queueType} className="mb-2">
                    <p className="font-bold">{entry.queueType}</p>
                    <p>{entry.tier} {entry.rank} • {entry.leaguePoints} LP</p>
                    <p className="text-sm text-gray-400">
                      {entry.wins}V {entry.losses}D ({Math.round((entry.wins / (entry.wins + entry.losses)) * 100)}% WR)
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}