# DATA_MODEL.md — Rascunho de entidades e relações

> Rascunho conceitual, não DDL final. Tipos são indicativos (Postgres). Campos
> marcados "reservado" existem desde já para não fechar a porta às fases
> futuras, mas não são preenchidos pelo MVP (módulo de Pedido).

## Visão geral das entidades

```
fornecedores 1───* pedidos 1───* pedido_itens
                     │
                     ├───* pedido_documentos
                     │
                     └───* pedido_fase_status

empresas (RTX, BG, BRA, BW, full, cross — mesmos ids de fin_empresas)
                     │
                     └───* nf_transferencia  (reservado — fase futura)

fornecedores 1───* produtos 1───? estoque
                                1───? em_transito
                     (parametros — chave/valor, sem relação com produto)
```

## Módulo de decisão de compra (DECISIONS.md, decisões 12/15/16)

Anterior ao módulo de Pedido no fluxo — calcula quanto comprar antes de o
pedido em si existir. Venda **não é tabela deste banco**: é lida do painel-gbw
(só leitura, ver `backend/src/repo/vendasPainel.ts`).

### produtos

| campo | tipo | nota |
|---|---|---|
| sku | text pk | livre por enquanto — a normalização canônica de 14 chars do `rtx-pedidos` não foi trazida (v1 mais simples) |
| descricao | text | |
| fornecedor_id | fk → fornecedores, nullable | direto, sem heurística de roteamento por numeração de SKU (mais simples que o `rtx-pedidos`, que infere pela linha do SKU) |
| unidades_por_caixa | numeric | |
| custo_unit_usd | numeric | |
| ativo | boolean | |

### estoque / em_transito

Um registro por SKU, quantidade única (sem quebra por depósito/container —
fica pra depois se for preciso). Editados manualmente na tela por enquanto
(decisão 15) — mesmo estágio que o `rtx-pedidos` já opera hoje (Tiny e
ClickUp não sincronizam de verdade lá).

### parametros

Chave/valor (`lead_time_dias`, `cobertura_alvo_dias`, `cambio`,
`janela_meses`) — sobrescreve os defaults do `.env` em runtime, mesmo padrão
do `rtx-pedidos`.

## fornecedores

Extensível além dos 2 atuais — nenhum campo hardcoded para "rolos"/"placas".

| campo | tipo | nota |
|---|---|---|
| id | uuid pk | |
| nome | text | |
| pais | text | |
| contato_nome / contato_email / contato_telefone | text | |
| contato_wechat | text | comunicação de produção continua fora do sistema |
| moeda_padrao | text | ex. USD |
| exige_pagamento_inicial | boolean | alguns fornecedores exigem, outros não (seção 2) |
| percentual_pagamento_inicial | numeric, nullable | ex. 30% — só relevante quando `exige_pagamento_inicial=true` |
| layout_pedido | jsonb | descreve o formato de planilha esperado por este fornecedor (colunas, unidade de item — ver seção "Por que `layout_pedido` existe" abaixo) |
| ativo | boolean | |

### Por que `layout_pedido` existe
Os dois exemplos reais de proforma invoice recebidos são estruturalmente
diferentes: o fornecedor de rolos (adesivo vinílico) precifica por m² e
descreve cada item por largura × comprimento × quantidade × m²; o fornecedor
de placas (3D wall sticker) precifica por peça, com pacote/caixa, CBM e peso
bruto por linha. Um schema de item fixo (campo a campo) quebraria assim que
um terceiro fornecedor aparecesse com outro formato. `layout_pedido` guarda
qual conjunto de colunas esse fornecedor usa, para orientar a tela de
cadastro de itens e a exportação da planilha.

## pedidos

Aggregate root do processo de importação. No MVP, representa só a fase de
Pedido; nas próximas fases (fora do MVP), o mesmo registro acumula o
progresso das fases seguintes via `pedido_fase_status`.

| campo | tipo | nota |
|---|---|---|
| id | uuid pk | |
| fornecedor_id | fk → fornecedores | |
| numero_referencia | text | espelha a numeração do fornecedor quando existir (ex. `DO260623318`, `PI 26283`) |
| status | text (enum extensível) | MVP usa `rascunho`, `enviado_fornecedor`. Valores reservados para fases futuras: `aguardando_pagamento_inicial`, `em_producao`, `embarcado`, `aguardando_desembaraco`, `em_desova`, `conferencia`, `finalizado`, `cancelado` |
| moeda | text | |
| criado_por | fk → usuarios | |
| criado_em / atualizado_em | timestamptz | |
| observacoes | text | |

## pedido_itens

| campo | tipo | nota |
|---|---|---|
| id | uuid pk | |
| pedido_id | fk → pedidos | |
| item_code | text, nullable | código do fornecedor (ex. `DG3111G`) |
| sku_interno | text, nullable | vínculo com SKU interno — pode ficar em branco no MVP se o produto ainda não existe no catálogo |
| descricao | text | |
| quantidade | numeric | |
| unidade | text | `m2`, `peca`, `pacote` — varia por fornecedor |
| preco_unitario | numeric | |
| valor_total | numeric | |
| atributos_extra | jsonb | campos específicos do fornecedor: para rolos, `{largura, comprimento, peso_liquido, peso_bruto, volume}`; para placas, `{tamanho, embalagem, pcs_por_caixa, pacotes, cbm, peso_bruto}` |

## pedido_documentos

Um anexo por linha, já com o campo de fase que as próximas iterações vão
usar — mesmo o MVP só gerando documentos com `fase='pedido'`.

| campo | tipo | nota |
|---|---|---|
| id | uuid pk | |
| pedido_id | fk → pedidos | |
| fase | text (enum) | `pedido` (única usada no MVP); reservado: `pagamento_inicial`, `producao`, `embarque`, `desembaraco`, `transporte`, `conferencia`, `pagamento_final`, `contabilidade` |
| tipo_documento | text (enum) | `invoice_proforma` (MVP); reservado: `invoice_comercial`, `comprovante_pagamento`, `packing_list`, `bl`, `di`, `nf_transferencia`, `outro` |
| arquivo_url / storage_path | text | |
| versao | integer | para rastrear proforma → invoice final quando a quantidade mudar (seção 6 do prompt original — auditabilidade da divergência) |
| enviado_por | fk → usuarios | |
| enviado_em | timestamptz | |
| observacoes | text | |

## pedido_fase_status (reservado — não populado pelo MVP)

Existe desde já porque replicar a granularidade do ClickUp (status + anexos +
observações **por fase**, não um campo único) foi um requisito explícito.
Criar a tabela agora evita uma migração de schema disruptiva quando o módulo
de Pagamento entrar.

| campo | tipo | nota |
|---|---|---|
| id | uuid pk | |
| pedido_id | fk → pedidos | |
| fase | text (mesmo enum de `pedido_documentos.fase`) | |
| responsavel_id | fk → usuarios | |
| status | text | |
| data_prevista / data_real | date | |
| observacoes | text | trilha de consultas por fase, equivalente ao histórico de comentários do ClickUp |

## empresas (referência — não recriada do zero)

Proposta: usar os mesmos identificadores que `fin_empresas` já usa em
`financeiro-gbw` (`RTX`, `BG`, `BW`, `BRA`, `BRT`, e o que mais existir para
`full`/`cross`), como convenção de valores — não como FK cross-database
(bancos diferentes no MVP). Isso evita que a nota fiscal de transferência
RTX→empresa de venda (obrigatória, seção 6) precise de um mapeamento de ids
manual mais tarde.

## nf_transferencia (reservado — fase futura, fora do MVP)

Modelado aqui só para deixar claro onde vai encaixar, não implementado agora.

| campo | tipo | nota |
|---|---|---|
| id | uuid pk | |
| pedido_id | fk → pedidos | |
| empresa_origem | text | sempre `RTX` na prática |
| empresa_destino | text | BG/BRA/BW/full/cross |
| numero_nf | text | |
| valor | numeric | |
| data_emissao | date | |
| status | text | |

## Pontos deixados em aberto de propósito

- **Bipagem/código de barras**: não modelado no MVP. `pedido_itens` guarda
  `item_code` (código do fornecedor) e futuramente pode ganhar um vínculo com
  uma tabela de código de barras — responsabilidade do módulo de Conferência,
  não deste desenho.
- **Localização por galpão**: idem — entra no módulo de Conferência/Estoque,
  não no de Pedido. Não modelado aqui para não presumir estrutura antes da
  hora.
- **DI (Declaração de Importação)**: reservado como um futuro campo
  `numero_di` numa tabela `pedido_desembaraco` (fase de Desembaraço,
  fora do MVP), referenciando `pedido_id`.
