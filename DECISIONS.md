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

## Correção de um fato registrado errado

**`rtx-pedidos` NÃO é legado nem está fora de escopo** — correção às decisões 1
e 5 abaixo (que o classificavam assim). Investigação mostrou: último commit é
recente, o sistema **está em produção no Railway agora**, e é usado **na
prática** para a decisão de compra (confirmado por Beatriz). Um commit recente
de Gustavo (sócio responsável pela parte de desenvolvimento, junto com
Beatriz) já tinha começado a consolidar o projeto para migrá-lo para a org
`rtx-imports` — a mesma direção que este projeto está tomando agora, de forma
independente. Ver decisão 12 abaixo para o que isso muda no escopo.

## Decididas

1. **Repositório novo e separado** de `financeiro-gbw` e de
   `C:\Users\Beatriz BW\Desktop\projetos-antigos\rtx-pedidos` (sistema em
   produção, não legado — ver correção acima e decisão 12). Nenhum código foi
   copiado de nenhum dos dois ainda. Repositório GitHub criado em
   `rtx-imports/rtx-estoque-importacao`.
2. **MVP = módulo de Pedido apenas**: cadastro de fornecedores, criação de
   pedido com itens, exportação da planilha no formato do fornecedor, anexo da
   invoice proforma. Nenhuma outra fase entra nesta iteração — decisão 12
   adiciona um módulo novo (decisão de compra), mas não muda o que o módulo de
   Pedido em si faz.
3. **Schema de item de pedido é flexível por fornecedor**, não um conjunto
   fixo de colunas — confirmado pelos dois exemplos reais de proforma
   recebidos (rolos vs. placas têm estruturas de item completamente
   diferentes).
4. **Fases do processo nascem modeladas granularmente** (status, anexos e
   observações por fase, não um campo único por pedido) — réplica intencional
   da estrutura do ClickUp atual, mesmo que o MVP só popule a fase `pedido`.
5. **Tiny ERP é somente leitura** para este sistema, quando a integração
   entrar (fora do MVP) — regra que funcionou bem no `rtx-pedidos` (ver
   correção acima) e evita risco de o novo sistema escrever no ERP por
   engano.
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
    **Nuance importante (corrigida por Beatriz):** essa regra é sobre não
    **aumentar banco/storage/compute** no projeto Supabase compartilhado — não
    é sobre evitar dependência de dado entre sistemas do grupo. Os sistemas da
    RTX já são interdependentes por natureza (painel-gbw depende do Tiny, que
    depende do marketplace) — ler dado de venda do painel-gbw (só leitura, sem
    escrever nem crescer o banco de lá) é só mais um elo normal dessa cadeia,
    não uma dependência a evitar. O que continua valendo é não criar banco ou
    storage **próprio deste sistema** dentro do Supabase compartilhado.
12. **A decisão de compra (quanto pedir de cada SKU) passa a ser tomada
    dentro deste sistema**, não só o registro/acompanhamento do pedido já
    decidido. Confirmado por Beatriz: o processo de importação e estoque
    começa pela decisão do sócio Bruno sobre quanto comprar — isso precisa
    estar aqui, não num sistema à parte. Na prática isso significa absorver o
    motor de cálculo do `rtx-pedidos` (fórmula de reposição por demanda ×
    cobertura − estoque − trânsito, plano de compra mês a mês, classificação
    ABC — todas funções puras, testadas, sem acoplamento a infraestrutura) como
    um módulo novo, **anterior** ao módulo de Pedido no fluxo. Não trazer a
    parte de sincronização do `rtx-pedidos` (Tiny desligado, scraping do
    ClickUp, arquivos JSON manuais no volume do Railway, dependência do
    Supabase compartilhado para dado de venda) — é o tipo de acoplamento que a
    decisão 11 já descartou.
13. **Os itens do pedido nascem da proposta de compra, não de digitação
    manual.** Quando o módulo de decisão de compra existir, "criar pedido"
    passa a ser "gerar pedido a partir da proposta aprovada" — os SKUs e
    quantidades que saíram do cálculo/ajuste na tela viram os itens do pedido
    automaticamente, em vez do cadastro manual que o MVP usa hoje (que
    continua existindo como fallback/ajuste pontual). Além disso, a
    reconciliação entre proforma e invoice final — já prevista em
    `pedido_documentos.versao` no nível de documento — também precisa
    acontecer nos **itens**: quando a invoice final vem com quantidade
    diferente da proforma, o item do pedido precisa refletir isso, não só o
    anexo. Ainda não desenhado, registrado como requisito para quando essa
    fase começar.
14. **Sequenciamento: decisão de compra passa a ser a próxima prioridade**,
    à frente de terminar de validar o módulo de Pedido (revisa a decisão 13
    original, que dizia o contrário — confirmado por Beatriz). Durante a
    transição, **`rtx-pedidos` continua no ar em uso normal por Bruno**, sem
    nenhuma mudança lá; este projeto só lê o código dele como referência até o
    módulo novo estar pronto e validado.
15. **Venda vem por leitura do painel-gbw** (mesma fonte que o `rtx-pedidos`
    já usa) — não é uma dependência a evitar, ver nuance da decisão 11: ler
    dado de outro sistema do grupo é normal, o que se evita é aumentar
    banco/storage próprio no Supabase compartilhado. Ressalva de Beatriz: essa
    leitura deve ser abstraída (não espalhar SDK/chamada direta do Supabase
    pelo código) para poder trocar a fonte mais adiante sem reescrever o
    módulo. Estoque e trânsito continuam sendo informados na tela/planilha
    manualmente por enquanto, do mesmo jeito que já funciona no `rtx-pedidos`
    hoje (Tiny e ClickUp não sincronizam de verdade lá).
16. **Primeira versão do módulo calcula só a necessidade de compra por
    produto** (a fórmula de reposição: demanda × cobertura − estoque −
    trânsito). Plano de compra de 6 meses, classificação ABC e valorização de
    estoque em 3 estágios ficam para depois — não entram nesta primeira
    versão.

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
   começarem — não usar o scaffold de integração com ClickUp do `rtx-pedidos`
   sem revisão (nunca foi confirmado funcionando).
4. **Formato exato da planilha de exportação do pedido — pista forte
   encontrada, falta confirmar.** Os dois arquivos enviados
   (`DO260623318_pedido inicial rolos.xlsx`, `PI 26283_Pedido inicial_placas.xlsx`)
   são as proforma invoices que os fornecedores retornam, não o formato de
   envio da RTX. O `rtx-pedidos` já gera uma planilha `.xlsx` no layout da aba
   "Container" que a empresa usa hoje para mandar pedido ao fornecedor —
   provavelmente é essa a resposta, mas precisa de confirmação de Beatriz
   antes de assumir como definitivo.
5. **Usuários e permissões por fase** (importação, financeiro, estoque, RH) —
   quem serão e quais níveis de acesso, a partir do módulo de Pagamento em
   diante. Nem `financeiro-gbw` nem `painel-gbw` têm hoje controle de
   permissão por usuário — não há um padrão existente para copiar; será
   construído do zero. Depende de Beatriz.
6. ~~Escopo exato do módulo de decisão de compra~~ — resolvido pelas decisões
   15 e 16 abaixo. Continua em aberto só o desenho técnico (schema, camadas),
   que é o próximo passo.

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
