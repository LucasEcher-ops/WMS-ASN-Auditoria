# Auditoria ASN / MI / MTB — Entrega para Codex

## Objetivo obrigatório

Publicar em **GitHub Pages** um site instalador da **Auditoria ASN / MI / MTB** com aparência **igual à página existente do Painel Qualidade**:

- Site visual de referência: <https://lucasecher-ops.github.io/Painel-Qualidade/>
- Código-fonte da referência: <https://github.com/LucasEcher-ops/Painel-Qualidade/blob/main/index.html>
- Destino previsto: <https://lucasecher-ops.github.io/WMS-ASN-Auditoria/>
- Repositório esperado: `LucasEcher-ops/WMS-ASN-Auditoria`

**Instrução ao Codex:** copiar o padrão visual e a experiência de instalação do Painel Qualidade, substituindo apenas o nome, descrição, versões, botões/URLs e ajuda do projeto. **Não usar o layout escuro** do instalador antigo. Este pacote já traz `index.html` adaptado e é a fonte inicial para o novo site.

## Referência visual: fidelidade exigida

O `index.html` deve manter os elementos visuais que caracterizam o Painel Qualidade:

1. Fundo claro branco/creme com gradientes laranja e **3 bolhas decorativas**.
2. Cartão branco centralizado, largo, cantos bem arredondados e sombra laranja suave.
3. Hero superior em degradê Shopee (`#ee4d2d` → `#ff6a39`).
4. Logo Shopee à esquerda e **Shopito animado** à direita, como na página de referência.
5. Título e descrição do painel no cabeçalho.
6. Seção **Como funciona a instalação?** com selo verde das versões.
7. **Três cartões numerados**: extensão Tampermonkey, instalar painel, abrir WMS.
8. Botões grandes nas cores **laranja, verde e azul**, nessa ordem.
9. Área **Se algo não funcionar** e rodapé.
10. Mesmas proporções, respiros, tipografia Arial e comportamento responsivo do painel de referência.

Assets já usados na página de referência (reutilizar somente se o uso interno estiver autorizado):

- Logo: `https://lucasecher-ops.github.io/Problem-Solver-Bot/assets/shopee-logo.png`
- Shopito: `https://lucasecher-ops.github.io/Problem-Solver-Bot/assets/shopito-aprova.gif`

Se os assets externos não estiverem disponíveis, **não quebrar o cabeçalho**: providenciar cópias autorizadas no próprio repositório ou usar uma alternativa identificável, sem adicionar serviços terceiros.

## Conteúdo específico da Auditoria

Nome: **Auditoria ASN / MI / MTB**.

Descrição: painel de consulta integrado ao WMS que parte da ASN, lista todas as SKUs vinculadas, localiza MIs e MTBs, confere quantidades de Received e Putaway, consulta devices e permite analisar divergências/CSV.

Fluxo de instalação no site:

| Etapa | Texto do botão | Destino |
|---|---|---|
| 1 | Instalar extensão | `https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?pli=1` |
| 2 | Instalar painel | `https://www.tampermonkey.net/script_installation.php#url=https://raw.githubusercontent.com/LucasEcher-ops/WMS-ASN-Auditoria/main/loader.user.js` |
| 3 | Abrir WMS | `https://wms.ssc.shopee.com.br/` |

Exibir as versões **Motor 3.1.0 · Loader 3.2.0** conforme `manifest.json` existente. Alterar o número só se os artefatos forem versionados juntos e testados.

## Arquivos que o Codex deve subir

Estrutura **na raiz** do repositório (não criar uma pasta extra dentro do GitHub):

```text
WMS-ASN-Auditoria/
├── index.html              # Instalador visual, igual ao Painel Qualidade
├── loader.user.js          # Loader Tampermonkey
├── loader.meta.js          # Metadados de atualização
├── loader-bootstrap.js     # Feedback de carregamento
├── app/
│   └── main.js             # Motor de auditoria
├── manifest.json           # Versões e SHA-256
├── atualizar.py            # Utilitário para novas versões
├── favicon.svg
├── robots.txt
├── .nojekyll
└── README.md
```

O `Loader_Tampermonkey.txt` pode permanecer como cópia de distribuição. Não é preciso publicar arquivos `__pycache__`, `.pyc`, backups ou versões antigas duplicadas.

## Não quebrar o que já funciona

- **Não reescrever o motor** `app/main.js` durante o trabalho visual; preservar a lógica de consulta por ASN, todas as SKUs, MIs/MTBs, paginação, Received x Putaway, devices, filtros, exportação CSV, minimização e **bolha arrastável**.
- Não instalar dois scripts equivalentes ao mesmo tempo. Usuários da versão avulsa v3.1 devem desativá-la após instalar o loader.
- Conservar `@match` restrito ao domínio WMS, `@updateURL`, `@downloadURL`, `@require` e integridade SHA-256 do loader.
- O projeto atual usa `@require` versionado + hash; ao alterar `app/main.js`, rodar `python atualizar.py 3.2.1` (ou outra versão superior) e publicar `app/main.js`, `loader.user.js`, `loader.meta.js`, `manifest.json` juntos. O Tampermonkey verifica atualização segundo suas configurações: **não prometer atualização instantânea**.
- O site deve ser estático; não criar autenticação própria, não pedir senha, não armazenar token e não transmitir dados de operação a um backend externo.
- A auditoria **consulta**, não altera estoque. A consulta automática de MIs do motor atual pode não cobrir ordens concluídas; não vender isso como cobertura completa sem verificar outra API.

## Publicação e verificação pelo Codex

1. Verificar se `LucasEcher-ops/WMS-ASN-Auditoria` já existe. Se existir, atualizar mantendo histórico, sem sobrescrever mudanças não relacionadas. Se não existir, criar repositório conforme as permissões disponíveis e confirmar destino antes de publicar em outra conta.
2. Enviar o conteúdo da pasta para a raiz da branch `main`.
3. Configurar GitHub Pages em **Settings → Pages → Deploy from a branch → main / (root)**, se ainda não estiver configurado.
4. Validar acesso à URL `https://lucasecher-ops.github.io/WMS-ASN-Auditoria/`.
5. Comparar visualmente com `https://lucasecher-ops.github.io/Painel-Qualidade/` em desktop e celular. A estrutura visual deve ser a mesma, com textos da Auditoria.
6. Conferir os três links, título, logo, Shopito, versão e CSS responsivo.
7. Verificar que `sha256(app/main.js)` corresponde ao fragmento do `@require` de `loader.user.js` e ao `manifest.json`.
8. Instalar no Tampermonkey em perfil autorizado de testes, confirmar que aparece uma só bolha da Auditoria no WMS, mover e minimizar o painel e testar uma ASN de homologação. Não executar alterações de estoque.
9. Informar a URL publicada, commit, itens testados e limitações reais encontradas.

## Segurança e LGPD

**Atenção:** GitHub Pages e arquivos estáticos publicados podem ser acessíveis publicamente. Antes de publicar o motor com endpoints internos, verificar autorização da Segurança da Informação e política corporativa. Não subir credenciais, cookies, headers de autenticação, tokens nem respostas de API com dados pessoais/operacionais reais. Separar claramente o portal público de instalação da execução autenticada no WMS. Esta página não concede permissões ao WMS.

## Estado deste pacote

- `index.html`: alinhado visualmente ao código-fonte original do Painel Qualidade.
- Loader: **3.2.0** (arquivos mantidos).
- Motor: **3.1.0** (sem mudanças neste ajuste visual).
- Publicação online: **não realizada por este pacote**. O Codex fará o envio e a validação.
