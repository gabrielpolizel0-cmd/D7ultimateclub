'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateBracket } from '@/lib/bracket';

interface PageProps {
  params: { id: string };
}

export default function AdminPage({ params }: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleGenerate() {
    if (!confirm('Tem certeza? Isso vai fechar as inscricoes e gerar o bracket!')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await generateBracket(params.id);
      setSuccess('Bracket gerado! ' + result.matchesCreated + ' partidas criadas em ' + result.totalRounds + ' rodadas (bracket de ' + result.bracketSize + ').');

      setTimeout(function () {
        router.push('/torneios/' + params.id + '/bracket');
      }, 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleVoltar() {
    router.push('/torneios/' + params.id);
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Admin do Torneio</h1>
        <p className="text-gray-400 mb-8">
          Use esse painel pra fechar inscricoes e gerar o bracket.
        </p>

        <div className="p-6 bg-gray-900 border border-gray-800 rounded-lg space-y-4">
          <div>
            <h2 className="font-bold text-lg mb-1">Gerar Bracket</h2>
            <p className="text-sm text-gray-400">
              Isso vai sortear todos os inscritos em pares aleatorios e criar todas as partidas.
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 text-black font-bold rounded transition-colors"
          >
            {loading ? 'Gerando bracket...' : 'Sortear e Gerar Bracket'}
          </button>

          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded text-sm">
              Erro: {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-900/50 border border-emerald-700 rounded text-sm">
              {success}
              <p className="mt-2 text-xs">Redirecionando pro bracket...</p>
            </div>
          )}
        </div>

        <button
          onClick={handleVoltar}
          className="inline-block mt-4 text-emerald-400 hover:underline text-sm"
        >
          Voltar pro torneio
        </button>
      </div>
    </div>
  );
}