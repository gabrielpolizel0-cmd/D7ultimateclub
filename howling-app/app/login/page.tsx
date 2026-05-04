'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(email, password);
      router.push('/');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">Entrar</h1>
        <p className="text-gray-400 mb-8">
          Acesse sua conta D7 Ultimate Club
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
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded text-white focus:border-emerald-500 focus:outline-none"
            />
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
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Não tem conta?{' '}
          <a href="/cadastro" className="text-emerald-400 hover:underline">
            Criar conta
          </a>
        </p>
      </div>
    </div>
  );
}