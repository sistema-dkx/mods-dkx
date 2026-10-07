import type { Register, SessionRateLimit, SessionUsage } from 'claude-code'

import type { Uso } from '../types'

const USO = { plugin: 'barra-de-uso', key: 'uso' } as const

const PEDIDO_REGISTRO =
  'Antes de compactar: salve na memória o que for importante desta sessão e ainda não estiver registrado (decisões, pendências, preferências e o estado do trabalho). Seja breve e não faça mais nada além disso.'

const INSTRUCOES =
  'Preserve tudo que for necessário para continuar o trabalho sem perda: objetivo atual, decisões tomadas e o porquê, ' +
  'arquivos e caminhos mexidos, estado do que está feito e do que falta, pendências, erros encontrados e preferências do usuário. ' +
  'Responda em português do Brasil.'

const barra = (pct: number, largura = 20) => {
  const cheio = Math.max(0, Math.min(largura, Math.round((pct / 100) * largura)))
  return '█'.repeat(cheio) + '░'.repeat(largura - cheio)
}

// barra dividida em 6 blocos de ~16,7% (seg a qui, sáb/dom: um bloco cada), separados por uma linha
const blocos = (pct: number, n = 6, w = 3) => {
  const por = 100 / n
  const partes: string[] = []
  for (let i = 0; i < n; i++) {
    const cheio = Math.max(0, Math.min(w, Math.round(((pct - i * por) / por) * w)))
    partes.push('█'.repeat(cheio) + '░'.repeat(w - cheio))
  }
  return partes.join('│')
}

// a partir de quantos % de contexto o botão vira alerta
const LIMITE_ALERTA = 50
const LARANJA = '#FC6715'
const cor = (pct: number) => (pct >= 90 ? 'red' : LARANJA)

const reinicio = (iso: string | undefined, agora: number) => {
  if (!iso) return undefined
  const min = Math.max(0, Math.round((Date.parse(iso) - agora) / 60000))
  if (min >= 1440) return `${Math.floor(min / 1440)}d${Math.floor((min % 1440) / 60)}h`
  return min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min}min`
}

const janela = (limites: SessionRateLimit[], tipo: string, agora: number) => {
  const l = limites.find(x => x.kind === tipo)
  return l ? { pct: l.percentUsed, reinicia: reinicio(l.resetsAt, agora) } : null
}

function montar(u: SessionUsage, agora: number): Uso {
  return {
    contexto: u.context.percent ?? null,
    tokens: u.context.tokens ?? null,
    janela: u.context.window,
    cincoHoras: janela(u.rateLimits, 'five_hour', agora),
    semana: janela(u.rateLimits, 'seven_day', agora),
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const novo = montar(await $.session.usage(), await $.clock.now())
    await $.state.set(USO, novo)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const novo = montar(await $.session.usage(), await $.clock.now())
    await $.state.set(USO, novo)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const { value: u = null } = await $.state.get(USO)
    if (e.props.hasSurvey || u === null) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const ctx = u.contexto
    const alerta = ctx !== null && ctx >= LIMITE_ALERTA
    const k = (n: number | null) => (n === null ? '?' : `${Math.round(n / 1000)}k`)

    // roda na própria conversa: primeiro pede o registro na memória, depois /compact
    const compactar = async () => {
      $.ui.toast('Registrando e compactando na conversa...')
      await $.prompt.submit({ text: PEDIDO_REGISTRO })
      await $.command.run({ command: 'compact', args: INSTRUCOES })
    }

    return (
      <Box flexDirection="column">
        <Box>
          <Text>Contexto </Text>
          <Text color={ctx === null ? undefined : cor(ctx)}>{barra(ctx ?? 0)}</Text>
          <Text> {ctx === null ? '--' : `${Math.round(ctx)}%`} ({k(u.tokens)}/{k(u.janela)}) </Text>
          {alerta ? (
            <Box>
              <Text backgroundColor={LARANJA} color="black" bold> Hora de compactar </Text>
              <Text> </Text>
              <Button
                key="compactar"
                variant="primary"
                label={'Registrar e compactar agora'}
                onPress={() => compactar()}
              />
            </Box>
          ) : (
            <Box>
              <Text color={LARANJA}>[ </Text>
              <Button
                key="compactar"
                plain
                label={'Registrar e compactar'}
                onPress={() => compactar()}
              />
              <Text color={LARANJA}> ]</Text>
            </Box>
          )}
        </Box>
        <Box>
          <Text dimColor>5h </Text>
          <Text color={u.cincoHoras ? cor(u.cincoHoras.pct) : undefined}>{barra(u.cincoHoras?.pct ?? 0, 12)}</Text>
          <Text dimColor>
            {' '}{u.cincoHoras ? `${Math.round(u.cincoHoras.pct)}%${u.cincoHoras.reinicia ? ` (reinicia ${u.cincoHoras.reinicia})` : ''}` : '--'}
            {'   '}
          </Text>
          <Text color={u.semana ? cor(u.semana.pct) : undefined}>{blocos(u.semana?.pct ?? 0)}</Text>
          <Text dimColor>
            {' '}{u.semana ? `${Math.round(u.semana.pct)}%${u.semana.reinicia ? ` (reinicia ${u.semana.reinicia})` : ''}` : '--'}
          </Text>
        </Box>
      </Box>
    )
  })
}
