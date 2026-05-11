'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/lib/auth';
import { fbqTrack } from '@/lib/pixel';

export default function CadastroPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [riotId, setRiotId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Separa "PolizaShow#3056" → ["PolizaShow", "3056"]
      const [gameName, tagLine] = riotId.split('#');
      if (!gameName || !tagLine) {
        throw new Error('Riot ID inválido. Use o formato: Nome#TAG');
      }

      if (password.length < 6) {
        throw new Error('Senha deve ter pelo menos 6 caracteres.');
      }

      await signUp({ email, password, gameName, tagLine });
      
      // 🎯 Meta Pixel: dispara evento de Lead / CompleteRegistration
      // pra otimização de campanha
      fbqTrack('Lead', { content_name: 'Cadastro D7' });
      fbqTrack('CompleteRegistration', { content_name: 'Cadastro D7' });
      
      setSuccess(true);
      
      // Redireciona pra home após 2 segundos
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold mb-2">Cadastro realizado!</h1>
          <p className="text-gray-400">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">Criar conta</h1>
        <p className="text-gray-400 mb-8">
          Vincule sua conta Riot e participe dos torneios D7
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">
              Riot ID <span className="text-gray-500 font-normal">(BR)</span>
            </label>
            <input
              type="text"
              required
              value={riotId}
              onChange={(e) => setRiotId(e.target.value)}
              placeholder="Nome#TAG (ex: PolizaShow#3056)"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded text-white focus:border-emerald-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Vamos validar com a Riot e puxar seu rank automaticamente
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded text-sm">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 rounded font-bold transition-colors"
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Já tem conta?{' '}
          <a href="/login" className="text-emerald-400 hover:underline">
            Fazer login
          </a>
        </p>
      </div>
    </div>
  );
}