# MVP_SCOPE.md — Módulo de Pedido

Escopo fixado pela seção 4 do prompt original. Nada além disto entra nesta
iteração; pagamento, produção, desembaraço, conferência e contabilidade ficam
para iterações seguintes, uma de cada vez.

## Entregáveis do MVP

1. **Cadastro de fornecedores**
   - CRUD de `fornecedores` (ver DATA_MODEL.md).
   - Extensível além dos 2 atuais — nenhum fornecedor hardcoded no código.
   - Inclui `exige_pagamento_inicial` e `percentual_pagamento_inicial` como
     configuração por fornecedor (usados só como dado neste MVP — o fluxo de
     aprovação de pagamento em si é de uma fase futura).

2. **Criação de pedido com itens**
   - Pedido vinculado a um fornecedor.
   - Itens com quantidade, preço, e campos específicos do fornecedor via
     `atributos_extra` (ver DATA_MODEL.md — layout varia por fornecedor).

3. **Exportação da planilha de pedido**
   - Formato exato ainda pendente de confirmação
     (DECISIONS.md, pendente #7) — os arquivos recebidos até agora são as
     proformas que os fornecedores retornam, não o modelo de saída da RTX.
   - Implementação começa assim que o formato de saída for confirmado.

4. **Anexo de documentos (invoice proforma) ao pedido**
   - Upload e vínculo de arquivo à `pedido_documentos`, com
     `fase='pedido'`, `tipo_documento='invoice_proforma'`.
   - Sem integração com `financeiro-gbw` nesta fase — o anexo fica só neste
     sistema por enquanto (comprovantes/NFs só passam a ir para
     `financeiro-gbw` a partir da fase de Pagamento, fora do MVP).

## Explicitamente fora do MVP

- Fluxo de aprovação/pagamento inicial entre Importação e Financeiro.
- Qualquer integração com `financeiro-gbw`, Tiny ERP ou ClickUp.
- Autenticação com papéis/permissões diferenciados (login simples de usuário
  no MVP — ver ARCHITECTURE.md seção 3.5).
- Bipagem, localização por galpão, conferência física.
- DI, desembaraço aduaneiro, NF de transferência entre empresas.

## Critério de pronto do MVP

- Um usuário consegue cadastrar um fornecedor do zero (sem precisar editar
  código).
- Um usuário consegue criar um pedido, adicionar itens com os campos daquele
  fornecedor, anexar a invoice proforma, e exportar a planilha no formato
  esperado.
- Nenhum dado de produção de `financeiro-gbw`/`painel-gbw`/Tiny é lido ou
  escrito pelo novo sistema.
