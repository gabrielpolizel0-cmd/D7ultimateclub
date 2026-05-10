export const metadata = {
  title: 'Política de Privacidade · D7 Ultimate Club',
  description: 'Como o D7 Ultimate Club coleta, usa e protege seus dados pessoais.',
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="container-custom py-12 md:py-16 max-w-3xl">
        <p className="text-xs font-bold text-accent uppercase tracking-wider mb-3">
          Documento legal
        </p>
        <h1 className="text-3xl md:text-4xl font-black mb-2">Política de Privacidade</h1>
        <p className="text-text-soft mb-8">
          Última atualização: 10 de maio de 2026
        </p>

        <div className="space-y-8 text-text-soft leading-relaxed">

          <section>
            <p className="text-text">
              Esta política descreve como o <strong>D7 Ultimate Club</strong> coleta,
              utiliza e protege seus dados pessoais, em conformidade com a{' '}
              <strong>Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">1. Quem é o controlador dos dados</h2>
            <p>
              O controlador dos dados pessoais coletados nesta plataforma é{' '}
              <strong>Gabriel Polizel</strong>, pessoa física, contato:
              <a href="mailto:contato@d7ultimateclub.com.br" className="text-accent hover:text-accent-deep">
                {' '}contato@d7ultimateclub.com.br
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">2. Quais dados coletamos</h2>
            <p>Para o funcionamento da plataforma, coletamos os seguintes dados:</p>

            <div className="mt-4 space-y-4">
              <div className="bg-bg-card border border-border rounded-lg p-4">
                <p className="font-bold text-text mb-2">2.1. Dados informados por você</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>E-mail (para login e comunicações)</li>
                  <li>Senha (armazenada de forma criptografada — não temos acesso à senha em texto plano)</li>
                  <li>Riot ID (nome de invocador + tag)</li>
                  <li>Chave PIX (apenas se você for capitão e receber reembolso ou premiação)</li>
                </ul>
              </div>

              <div className="bg-bg-card border border-border rounded-lg p-4">
                <p className="font-bold text-text mb-2">2.2. Dados públicos da Riot Games</p>
                <p className="text-sm mb-2">Via Riot API oficial, coletamos dados públicos da sua conta:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>PUUID e Summoner ID</li>
                  <li>Nível de invocador e ícone de perfil</li>
                  <li>Tier, divisão e LP (rank)</li>
                  <li>Histórico de partidas de modos elegíveis (ARAM Desordem)</li>
                  <li>Estatísticas de partidas: KDA, dano causado, vitórias, derrotas</li>
                </ul>
              </div>

              <div className="bg-bg-card border border-border rounded-lg p-4">
                <p className="font-bold text-text mb-2">2.3. Dados técnicos</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Logs de acesso e uso da plataforma (timestamp, ações realizadas)</li>
                  <li>IP de origem (apenas em logs de segurança, não exibido publicamente)</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">3. Para que usamos seus dados</h2>
            <p>Os dados coletados são utilizados exclusivamente para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>Autenticar você na plataforma (login)</li>
              <li>Validar sua identidade no jogo (anti-smurf)</li>
              <li>Calcular seu ranking pessoal D7 com base em desempenho</li>
              <li>Gerenciar inscrições, brackets e resultados de torneios</li>
              <li>Processar pagamentos e reembolsos via PIX</li>
              <li>Comunicar avisos importantes (mudanças de torneio, novos eventos)</li>
              <li>Garantir a segurança da plataforma (logs)</li>
            </ul>
            <p className="mt-3 text-sm">
              <strong>Não vendemos, alugamos ou compartilhamos seus dados</strong> com terceiros
              para fins comerciais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">4. Base legal do tratamento</h2>
            <p>O tratamento dos seus dados se baseia em:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li><strong>Execução de contrato</strong> (art. 7º, V da LGPD) — para entregar o serviço que você contratou</li>
              <li><strong>Consentimento</strong> (art. 7º, I) — manifestado ao criar conta e aceitar estes termos</li>
              <li><strong>Cumprimento de obrigação legal</strong> (art. 7º, II) — registros fiscais e de defesa em processos</li>
              <li><strong>Legítimo interesse</strong> (art. 7º, IX) — segurança da plataforma e prevenção de fraudes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">5. Onde os dados ficam armazenados</h2>
            <p>
              Os dados são armazenados na infraestrutura do <strong>Supabase</strong>{' '}
              (provedor de banco de dados, com servidores na região sa-east-1, São Paulo, Brasil)
              e <strong>Vercel</strong> (provedor de hospedagem do site).
            </p>
            <p className="mt-3">
              Tomamos medidas técnicas razoáveis para proteger seus dados (criptografia em
              trânsito via HTTPS, senhas hasheadas, controle de acesso ao banco). Mas
              nenhum sistema é 100% imune — em caso de incidente de segurança, você será
              notificado conforme exige a LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">6. Por quanto tempo guardamos seus dados</h2>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>Dados de cadastro: enquanto sua conta estiver ativa</li>
              <li>Dados de partidas e ranking: 2 anos após a última partida</li>
              <li>Dados de pagamentos: 5 anos (por exigência fiscal)</li>
              <li>Logs técnicos: 6 meses</li>
            </ul>
            <p className="mt-3">
              Após esses períodos, os dados são anonimizados ou excluídos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">7. Seus direitos como titular</h2>
            <p>Pela LGPD, você tem direito a:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>Confirmar se tratamos seus dados e acessá-los</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar anonimização, bloqueio ou exclusão de dados desnecessários</li>
              <li>Solicitar a portabilidade dos seus dados</li>
              <li>Revogar o consentimento e excluir sua conta a qualquer momento</li>
              <li>Informações sobre com quem compartilhamos seus dados</li>
              <li>Oposição ao tratamento em casos específicos</li>
            </ul>
            <p className="mt-3">
              Para exercer qualquer um destes direitos, envie um e-mail para{' '}
              <a href="mailto:contato@d7ultimateclub.com.br" className="text-accent hover:text-accent-deep">
                contato@d7ultimateclub.com.br
              </a>
              . Responderemos em até 15 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">8. Cookies</h2>
            <p>
              Usamos apenas cookies <strong>essenciais</strong> para o funcionamento da
              plataforma (autenticação e sessão). Não usamos cookies de rastreamento,
              publicidade ou de redes sociais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">9. Crianças e adolescentes</h2>
            <p>
              A plataforma é direcionada a usuários com idade igual ou superior a 16 anos.
              Menores de 16 anos só podem usar o serviço com consentimento expresso dos
              pais ou responsáveis legais. Se descobrirmos cadastro de menor sem autorização,
              a conta será excluída e os dados removidos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">10. Mudanças nesta política</h2>
            <p>
              Esta política pode ser atualizada periodicamente. Mudanças relevantes serão
              comunicadas no Discord oficial e no site, com pelo menos 7 dias de antecedência.
              A data da última atualização é exibida no topo deste documento.
            </p>
          </section>

          <section className="border-t border-border-soft pt-6">
            <p className="text-sm">
              Dúvidas sobre privacidade ou exercício dos seus direitos:{' '}
              <a href="mailto:contato@d7ultimateclub.com.br" className="text-accent hover:text-accent-deep">
                contato@d7ultimateclub.com.br
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}