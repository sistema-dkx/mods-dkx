# Mods DKX para o Claude Code

Coleção de *mods* (extensões visuais) para o [Claude Code](https://claude.com/claude-code), feitos pela DKX.

## Mods disponíveis

| Mod | O que faz |
| --- | --- |
| [`barra-de-uso`](#barra-de-uso) | Mostra, acima do campo de digitar, o quanto da conversa (contexto) e dos limites de uso você já gastou, com botão para compactar. |

---

## Instalação (uma linha)

Cole no terminal:

```bash
claude plugin marketplace add sistema-dkx/mods-dkx && claude plugin install barra-de-uso@mods-dkx
```

Pronto. Abra uma sessão nova do Claude Code e a barra aparece acima do campo de digitar. Em uma sessão que já estava aberta, digite `/reload-plugins`.

**Para remover:**

```bash
claude plugin uninstall barra-de-uso@mods-dkx
```

**Para atualizar quando houver versão nova:**

```bash
claude plugin marketplace update mods-dkx && claude plugin update barra-de-uso@mods-dkx
```

---

## barra-de-uso

Uma barra de duas linhas acima do prompt:

```
Contexto ███░░░░░░░░░░░░░░░░░ 14% (138k/1000k)  [ Registrar e compactar ]
5h ██░░░░░░░░░░ 2% (reinicia 4h25)   ███│██░│░░░│░░░│░░░│░░░ 26% (reinicia 5d2h)
```

### Primeira linha: contexto da conversa

- Barra e porcentagem do **contexto** usado na sessão, com os tokens usados e o tamanho da janela do modelo.
- Quanto mais cheio o contexto, mais cara e menos precisa fica a conversa. Compactar resume o que já foi feito e libera espaço.
- **Botão `[ Registrar e compactar ]`:** sempre disponível. Ao clicar, a sessão é compactada na hora e um aviso confirma. O resumo é instruído a preservar objetivo, decisões e o porquê delas, arquivos mexidos, o que está feito e o que falta, pendências, erros encontrados e suas preferências.
- **Alerta aos 50%:** quando o contexto passa de 50%, aparece uma etiqueta laranja **"Hora de compactar"** e o botão vira **"Registrar e compactar agora"**. É o sinal de que está na hora.

### Segunda linha: seus limites de uso

- **5h:** quanto da janela de 5 horas já foi usada e quando ela reinicia.
- **Semana:** a barra semanal dividida em **6 blocos** (cerca de 16,7% cada), pensada para um bloco por dia de segunda a quinta e um por dia no fim de semana. Você vê de relance se está acima do ritmo.
- As barras são laranja e ficam vermelhas a partir de 90%.

### Quando a barra atualiza

A cada resposta do Claude (não em tempo real). As barras de 5h e semana só aparecem em **contas com assinatura** (Pro/Max) e depois da primeira resposta da sessão. Sem assinatura, só a barra de contexto funciona.

### Privacidade e segurança

- O mod roda **só no seu computador**. Ele lê os números de uso da **sua própria sessão** e da **sua própria conta**.
- **Não envia nada para a internet**, não grava arquivos e não lê o conteúdo das suas conversas.
- Cada pessoa vê apenas o uso da própria conta.
- O código é pequeno e está todo em [`barra-de-uso/hooks/register.tsx`](barra-de-uso/hooks/register.tsx), para você ler antes de instalar. Como qualquer mod, ele roda com as permissões do seu Claude Code, por isso leia o código antes.

### Personalizar

Edite as constantes no topo do [`register.tsx`](barra-de-uso/hooks/register.tsx):

| Constante | O que muda | Padrão |
| --- | --- | --- |
| `LIMITE_ALERTA` | % de contexto a partir do qual aparece o alerta | `50` |
| `LARANJA` | cor das barras | `#FC6715` |
| `INSTRUCOES` | o que o resumo da compactação deve preservar | texto em pt-BR |

Na função `blocos`, `n = 6` é o número de blocos da barra semanal.

### Requisitos

- Claude Code com suporte a mods (plugins com hooks de interface).
- Terminal ou aplicativo desktop do Claude Code.

### Problemas comuns

- **A barra não aparece:** digite `/reload-plugins` ou abra uma sessão nova.
- **5h e semana mostram `--`:** conta sem assinatura, ou ainda não houve uma resposta nesta sessão.
- **A segunda linha quebra:** a janela está estreita; alargue o terminal.

---

## Licença

MIT. Use, copie e adapte à vontade.
