'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function HomeCTAs() {
  const [logged, setLogged] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      setLogged(!!user);
    }
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (logged === null) {
    return (
      <div className="relative flex gap-3 flex-wrap">
        <div className="w-40 h-11 bg-bg-card rounded-lg animate-pulse"></div>
        <div className="w-32 h-11 bg-bg-card rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (logged) {
    return (
      <div className="relative flex gap-3 flex-wrap">
        <Link href="/torneios" className="btn-primary">
          Ver torneios abertos
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex gap-3 flex-wrap">
      <Link href="/cadastro" className="btn-primary">
        Criar conta grátis
      </Link>
      <Link
        href="/torneios"
        className="px-5 py-2.5 border border-border rounded-lg text-sm font-semibold hover:border-accent hover:text-accent transition-colors"
      >
        Ver torneios
      </Link>
    </div>
  );
}