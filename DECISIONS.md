# DECISIONS.md — Decididas vs. pendentes

## Contexto adicional (recebido depois do rascunho inicial)

O Supabase compartilhado por `financeiro-gbw` e `painel-gbw` acabou de passar
por um upgrade forçado por volume: banco em 12 GB, 32 GB de memória, 8 vCPUs —
já ultrapassando US$400/mês. Isso não significa migrar os sistemas existentes
agora (essa avaliação de servidor próprio vs. cloud gerenciada segue em
aberto, à parte, e não afeta este projeto), mas muda o peso de qualquer
decisão que aproximasse este sistema novo do Supabase: cada byte de banco ou
storage colocado lá contribui para o mesmo custo que já está subindo sem
controle. Por isso este sistema **não pode aumentar essa dependência** — ver
decisão 11 abaixo.

## Decididas

1. **Repositório novo e separado** de `financeiro-gbw` e de
   `C:\Users\Beatriz BW\Desktop\projetos-antigos\rtx-pedidos` (legado, fora de
   escopo). Nenhum código foi copiado de nenhum dos dois. Repositório GitHub
   criado em `rtx-imports/rtx-estoque-importacao`.
2. **MVP = módulo de Pedido apenas**: cadastro de fornecedores, criação de
   pedido com itens, exportação da planilha no formato do fornecedor, anexo da
   invoice proforma. Nenhuma outra fase entra nesta iteração.
3. **Schema de item de pedido é flexível por fornecedor**, não um conjunto
   fixo de colunas — confirmado pelos dois exemplos reais de proforma
   recebidos (rolos vs. placas têm estruturas de item completamente
   diferentes).
4. **Fases do processo nascem modeladas granularmente** (status, anexos e
   observações por fase, não um campo único por pedido) — réplica intencional
   da estrutura do ClickUp atual, mesmo que o MVP só popule a fase `pedido`.
5. **Tiny ERP é somente leitura** para este sistema, quando a integração
   entrar (fora do MVP) — regra que funcionou bem no `rtx-pedidos` legado e
   evita risco de o novo sistema escrever no ERP por engano.
6. **NF de transferência RTX ↔ empresa de venda é etapa obrigatória**, não
   opcional, quando essa fase for implementada (fora do MVP).
7. **Banco do MVP: Postgres add-on do Railway (isolado), não Supabase**
   (resolve o antigo PENDENTE #3). Motivo: zero contribuição para a conta do
   Supabase já em US$400+/mês; resolve também, por consequência, a tensão do
   antigo PENDENTE #2.
8. **Acesso a banco via driver Postgres puro** (`pg`/`postgres.js`), não SDK
   do Supabase (resolve o antigo PENDENTE #2) — consequência direta da
   decisão 7: sem Supabase no MVP, não há SDK proprietário a evitar.
9. **Autenticação do MVP: login usuário/senha simples, sem RBAC completo**
   (resolve o antigo PENDENTE #8). RBAC só faz sentido quando existir mais de
   um perfil de uso — isso começa a partir do módulo de Pagamento (Financeiro
   entra).
10. **Repositório `.github` da organização: já existe** (resolve o antigo
    PENDENTE #5) — `rtx-imports/.github` no GitHub, com cópia local em
    `Desktop\rtx-imports\.github`, contendo o pacote completo
    (CONTRIBUTING.md, COMMIT_CONVENTION.md, PULL_REQUEST_TEMPLATE.md,
    ISSUE_TEMPLATE/, CODE_OF_CONDUCT.md, profile/README.md). Nada a criar
    aqui; só seguir os padrões já publicados.
11. **"Vida fora do Supabase" é requisito de longo prazo deste projeto, não
    só uma escolha pontual do MVP.** Cada decisão futura (storage de anexos,
    autenticação, fila de jobs, etc.) deve preferir uma opção que funcione
    tanto em um VPS/servidor próprio quanto em Railway, mantendo a
    reversibilidade já prevista no desenho original. Isso não implica migrar
    `financeiro-gbw`/`painel-gbw` — essa avaliação segue separada e não deve
    ser antecipada por este projeto.

## Pendentes — nenhuma suposição foi feita, precisa de confirmação

1. **Projeto Railway de staging ainda não criado.** O repositório GitHub já
   existe (`rtx-imports/rtx-estoque-importacao`), mas esta sessão não tem
   credencial do Railway configurada — consistente com a prática de rotear
   trabalho de infraestrutura/credenciais para uma sessão dedicada. Não vou
   tentar criar o ambiente Railway a partir daqui.
2. **Mecanismo de integração com financeiro-gbw** (era PENDENTE #4) — segue
   adiado para a fase de Pagamento, com uma ressalva nova: quando essa fase
   chegar, apresentar duas opções lado a lado antes de implementar, sem
   decidir de antemão: (a) nova Edge Function em `financeiro-gbw` seguindo o
   padrão `nfe-emitir`, ou (b) endpoint HTTP simples fora do Supabase que
   `financeiro-gbw` consulta/chama — avaliando se vale continuar aprofundando
   dependência de Edge Function do Supabase (ver decisão 11) ou não. Só
   relevante a partir da fase de Pagamento (fora do MVP).
3. **ClickUp — migrar, integrar (leitura via API) ou paralelo?** Confirmado
   que segue adiado para quando os módulos de fase (pagamento em diante)
   começarem — não usar o scaffold não confirmado do `rtx-pedidos` legado sem
   revisão.
4. **Formato exato da planilha de exportação do pedido.** Os dois arquivos
   enviados (`DO260623318_pedido inicial rolos.xlsx`,
   `PI 26283_Pedido inicial_placas.xlsx`) são as **proforma invoices que os
   fornecedores retornam**, no formato deles — ainda não vi o formato que a
   RTX usa para *enviar* a quantidade pedida ao fornecedor. É o mesmo arquivo
   preenchido de volta, ou existe um modelo de saída diferente que a RTX
   produz? Depende de Beatriz (enviar em separado).
5. **Usuários e permissões por fase** (importação, financeiro, estoque, RH) —
   quem serão e quais níveis de acesso, a partir do módulo de Pagamento em
   diante. Nem `financeiro-gbw` nem `painel-gbw` têm hoje controle de
   permissão por usuário — não há um padrão existente para copiar; será
   construído do zero. Depende de Beatriz.

## O que ainda depende de Beatriz e não deve ser assumido

- Formato final da planilha de pedido (enviar em separado).
- Quem serão os usuários/perfis a partir do módulo de Pagamento.
- Decisão sobre servidor próprio vs. cloud gerenciada para a empresa como um
  todo — está em avaliação, não afeta o MVP deste sistema.

## Observação sobre o material já recebido

O texto "Plano sistema COMEX FINANCEIRO.txt" e as duas planilhas de proforma
(dentro de `material de apoio para o sistema estoque-importação/`) já
respondem, na prática, boa parte do que a seção 5 do prompt original listava
como "perguntas em aberto" sobre o processo em si — o que restou pendente
acima é mais sobre infraestrutura, integração técnica e formato exato de
saída, não sobre o processo de negócio, que já está bem descrito.
