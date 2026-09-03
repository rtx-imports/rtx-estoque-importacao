# DECISIONS.md — Decididas vs. pendentes

## Decididas

1. **Repositório novo e separado** de `financeiro-gbw` e de
   `C:\Users\Beatriz BW\Desktop\projetos-antigos\rtx-pedidos` (legado, fora de
   escopo). Nenhum código foi copiado de nenhum dos dois.
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

## Pendentes — nenhuma suposição foi feita, precisa de confirmação

1. **Nome e local exatos do repositório / projeto Railway de staging.**
   Encontrei uma pasta local vazia já criada em
   `Desktop\rtx-imports\rtx-estoque-importação` — usei esse nome/local para os
   documentos deste rascunho por parecer intencional, mas não criei repositório
   Git nem remoto GitHub nenhum. Esta sessão não tem `gh` CLI nem credencial do
   Railway configurada — consistente com sua prática de rotear trabalho de
   infraestrutura/credenciais para uma sessão dedicada, não vou tentar criar
   o repositório GitHub nem o ambiente Railway a partir daqui.
2. **Tensão real entre a regra "não usar SDK proprietário do Supabase" e o
   padrão atual do grupo**: tanto `financeiro-gbw` quanto `painel-gbw` usam
   `@supabase/supabase-js` hoje — nenhum dos dois usa driver Postgres puro,
   apesar de os dois rodarem sobre Supabase. Seguir a regra 0 à risca significa
   este sistema divergir do padrão atual do grupo. Confirmar se isso é
   intencional.
3. **Onde o banco deste sistema vai morar**: proposta em ARCHITECTURE.md é
   Postgres padrão do Railway (staging isolado, sem Supabase) — ou preferem
   já nascer num projeto Supabase novo e isolado (não o mesmo de
   `financeiro-gbw`/`painel-gbw`, que hoje compartilham um único projeto)?
4. **Mecanismo de integração com financeiro-gbw**: não existe hoje nenhuma
   tabela de comprovante/anexo nem bucket de arquivo em uso em
   `financeiro-gbw` — o padrão mais próximo é uma Supabase Edge Function
   chamada por POST com service-role key (ex. `nfe-emitir`). Confirmar se o
   caminho é (a) nova Edge Function em `financeiro-gbw` como ponto de entrada,
   (b) escrita direta em tabelas compartilhadas, ou (c) outro mecanismo. Só
   relevante a partir da fase de Pagamento (fora do MVP), mas vale alinhar
   cedo.
5. **`.github` padrão da organização**: não encontrei repositório `.github`
   central nem `padroes-github.md` em nenhum dos quatro repositórios do grupo
   inspecionados (`financeiro-gbw`, `painel-gbw`, `painel-gbwv2`,
   `devolucoes-gbw`). Confirmar se existe em algum lugar que eu não tenha
   acesso, ou se ainda não existe e este seria um bom momento para criá-lo.
6. **ClickUp — migrar, integrar (leitura via API) ou paralelo?** Pergunta já
   prevista no documento original. O legado `rtx-pedidos` tentou uma
   integração de leitura com a API do ClickUp e deixou isso como scaffold
   nunca confirmado funcionando — não é um caminho testado, então não vou
   assumir que é viável sem revisão. Só relevante a partir da fase de
   Pagamento em diante (fora do MVP), mas define se vale a pena investigar a
   API do ClickUp desde já.
7. **Formato exato da planilha de exportação do pedido.** Os dois arquivos
   enviados (`DO260623318_pedido inicial rolos.xlsx`,
   `PI 26283_Pedido inicial_placas.xlsx`) são as **proforma invoices que os
   fornecedores retornam**, no formato deles — ainda não vi o formato que a
   RTX usa para *enviar* a quantidade pedida ao fornecedor. É o mesmo arquivo
   preenchido de volta, ou existe um modelo de saída diferente que a RTX
   produz?
8. **Usuários e permissões por fase** (importação, financeiro, estoque, RH) —
   quem serão e quais níveis de acesso. Nem `financeiro-gbw` nem `painel-gbw`
   têm hoje controle de permissão por usuário — os dois usam login único
   compartilhado, então não há um padrão existente para copiar; isso será
   construído do zero quando os módulos de fase além do Pedido entrarem.

## Observação sobre o material já recebido

O texto "Plano sistema COMEX FINANCEIRO.txt" e as duas planilhas de proforma
(dentro de `material de apoio para o sistema estoque-importação/`) já
respondem, na prática, boa parte do que a seção 5 do prompt original listava
como "perguntas em aberto" sobre o processo em si — o que restou pendente
acima é mais sobre infraestrutura, integração técnica e formato exato de
saída, não sobre o processo de negócio, que já está bem descrito.
