export const metadata = {
  title: 'Termos de Uso · D7 Ultimate Club',
  description: 'Termos e condições de uso da plataforma D7 Ultimate Club.',
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="container-custom py-12 md:py-16 max-w-3xl">
        <p className="text-xs font-bold text-accent uppercase tracking-wider mb-3">
          Documento legal
        </p>
        <h1 className="text-3xl md:text-4xl font-black mb-2">Termos de Uso</h1>
        <p className="text-text-soft mb-8">
          Última atualização: 10 de maio de 2026
        </p>

        <div className="space-y-8 text-text-soft leading-relaxed">

          <section>
            <p className="text-text">
              Bem-vindo ao <strong>D7 Ultimate Club</strong>. Ao usar este site
              (d7ultimateclub.com.br) e participar dos torneios oferecidos, você concorda
              com os termos abaixo. Se não concordar, não use a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">1. Sobre o serviço</h2>
            <p>
              O D7 Ultimate Club é uma plataforma independente de organização de torneios
              amadores de ARAM Desordem (modo Howling Mayhem) do jogo League of Legends.
              A plataforma é operada por <strong>Gabriel Polizel</strong>, pessoa física,
              brasileiro, residente no Brasil, contato:
              <a href="mailto:contato@d7ultimateclub.com.br" className="text-accent hover:text-accent-deep">
                {' '}contato@d7ultimateclub.com.br
              </a>
              .
            </p>
            <p className="mt-3">
              <strong>Não temos qualquer afiliação, parceria ou endosso oficial da Riot Games, Inc.</strong>{' '}
              League of Legends, ARAM e demais marcas relacionadas pertencem aos seus respectivos
              donos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">2. Cadastro</h2>
            <p>
              Para usar a plataforma e participar de torneios, você deve criar uma conta
              vinculando seu Riot ID válido. Ao se cadastrar, você declara que:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>Tem ao menos 16 anos (menores precisam de autorização do responsável legal)</li>
              <li>O Riot ID informado pertence a você e está em conformidade com os Termos da Riot Games</li>
              <li>As informações fornecidas são verdadeiras</li>
              <li>Você não está banido por quebra de regras em torneios anteriores do D7</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">3. Inscrições em torneios</h2>
            <p>
              A inscrição em torneios é feita pelo <strong>capitão do time</strong>, que paga
              o valor total via PIX em nome dos 5 jogadores. Cada jogador deve ter cadastro
              individual ativo no D7 antes do início do torneio.
            </p>
            <p className="mt-3">
              <strong>A vaga só é confirmada após a comprovação do pagamento</strong> pela
              equipe de staff. Inscrições com pagamento pendente podem ser canceladas se as
              vagas se esgotarem.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">4. Política de reembolso</h2>
            <p>
              Reembolsos são oferecidos conforme as seguintes regras:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>
                <strong>Até 48 horas antes do início do torneio:</strong> reembolso total,
                solicitado pelo capitão via Discord oficial
              </li>
              <li>
                <strong>Menos de 48 horas antes:</strong> reembolso só será concedido se for
                possível repor o time pela lista de espera
              </li>
              <li>
                <strong>Após o início do torneio:</strong> sem reembolso, em qualquer hipótese
              </li>
              <li>
                <strong>Cancelamento do torneio por nossa parte:</strong> reembolso integral
                automático em até 7 dias úteis
              </li>
            </ul>
            <p className="mt-3 text-sm">
              Reembolsos são processados via PIX para a chave informada no momento da solicitação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">5. Conduta do jogador</h2>
            <p>
              Durante torneios e na comunidade (Discord), é proibido:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>Uso de smurfs, contas alternativas ou contas que não sejam do jogador cadastrado</li>
              <li>Uso de cheats, bugs intencionais, hacks ou qualquer software não autorizado</li>
              <li>Combinação de resultados (match-fixing) ou aposta em partidas próprias</li>
              <li>Toxicidade, racismo, homofobia, xenofobia, capacitismo ou qualquer forma de discriminação</li>
              <li>Trollagem proposital, AFK intencional ou abandono de partidas</li>
              <li>Compartilhamento de conta com terceiros durante o torneio</li>
              <li>Assédio, ameaças ou exposição de dados de outros participantes</li>
            </ul>
            <p className="mt-3">
              <strong>Punições:</strong> a equipe de staff poderá aplicar advertências,
              desclassificação imediata sem reembolso, e banimento permanente da plataforma
              em casos graves ou reincidências. Decisões do staff são finais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">6. Premiação</h2>
            <p>
              Os valores de premiação anunciados em cada torneio são pagos via PIX ao capitão
              do time vencedor em até <strong>72 horas após o término oficial do torneio</strong>.
              É responsabilidade do capitão dividir o prêmio entre os jogadores conforme acordo
              interno do time.
            </p>
            <p className="mt-3">
              O D7 Ultimate Club não se responsabiliza por divergências internas entre membros
              do time quanto à divisão da premiação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">7. Limitações de responsabilidade</h2>
            <p>
              O D7 Ultimate Club opera a plataforma e organiza torneios em regime de melhor
              esforço. Não nos responsabilizamos por:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>Indisponibilidade temporária do site, da Riot API ou dos servidores do jogo</li>
              <li>Atrasos ou cancelamentos causados por falhas na infraestrutura da Riot Games</li>
              <li>Conexão de internet, hardware ou software dos participantes</li>
              <li>Bugs do próprio jogo League of Legends</li>
              <li>Conduta de terceiros (incluindo outros participantes) fora da plataforma</li>
              <li>Danos indiretos, lucros cessantes ou perdas de oportunidade</li>
            </ul>
            <p className="mt-3">
              Em caso de problemas técnicos graves durante uma partida, o staff avaliará
              caso a caso a possibilidade de remarcar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">8. Propriedade intelectual</h2>
            <p>
              O nome &quot;D7 Ultimate Club&quot;, o logotipo e os textos do site são de
              propriedade do operador. Conteúdos relacionados ao jogo (nomes de campeões,
              imagens, ícones) pertencem à Riot Games, Inc. e são usados conforme política
              de fan content da Riot.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">9. Alterações dos termos</h2>
            <p>
              Estes termos podem ser atualizados a qualquer momento. Mudanças relevantes serão
              comunicadas no Discord oficial e no site, com pelo menos 7 dias de antecedência
              para entrar em vigor. Continuar a usar a plataforma após as mudanças implica
              concordância com a nova versão.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text mb-3">10. Lei aplicável e foro</h2>
            <p>
              Estes termos são regidos pelas leis da República Federativa do Brasil.
              Qualquer disputa será resolvida no <strong>foro da comarca do domicílio do
              consumidor</strong>, conforme o Código de Defesa do Consumidor (Lei 8.078/1990).
            </p>
          </section>

          <section className="border-t border-border-soft pt-6">
            <p className="text-sm">
              Dúvidas sobre estes termos?{' '}
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