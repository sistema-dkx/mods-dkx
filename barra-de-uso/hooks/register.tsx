import type { Register, SessionRateLimit, SessionUsage } from 'claude-code'

import type { Uso } from '../types'

const USO = { plugin: 'barra-de-uso', key: 'uso' } as const
const PROGRESSO = { plugin: 'barra-de-uso', key: 'progresso' } as const
const COMPACTANDO = { plugin: 'barra-de-uso', key: 'compactando' } as const

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
    await $.state.set(COMPACTANDO, false)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const novo = montar(await $.session.usage(), await $.clock.now())
    await $.state.set(USO, novo)
    await $.state.set(COMPACTANDO, false)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const { value: u = null } = await $.state.get(USO)
    if (e.props.hasSurvey || u === null) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const { value: ocupado = false } = await $.state.get(COMPACTANDO)
    const { value: prog = { passo: 0, seg: 0 } } = await $.state.get(PROGRESSO)
    const pontos = '.'.repeat((prog.passo % 3) + 1).padEnd(3, ' ')
    const deslizante = Array.from({ length: 8 }, (_, i) => (Math.abs(i - (prog.passo % 14 < 8 ? prog.passo % 14 : 14 - (prog.passo % 14))) <= 1 ? '▰' : '▱')).join('')
    const textoOcupado = `Compactando${pontos} ${deslizante} ${prog.seg}s`
    const ctx = u.contexto
    const alerta = ctx !== null && ctx >= LIMITE_ALERTA
    const k = (n: number | null) => (n === null ? '?' : `${Math.round(n / 1000)}k`)

    const compactar = async () => {
      await $.state.set(COMPACTANDO, true)
      const inicio = await $.clock.now()
      let feito = false
      const pronto = $.session.compact({ instructions: INSTRUCOES }).then(r => {
        feito = true
        return r
      })
      let passo = 0
      while (!feito) {
        const agora = await $.clock.now()
        await $.state.set(PROGRESSO, { passo, seg: Math.floor((agora - inicio) / 1000) })
        passo += 1
        await $.clock.sleep(400)
      }
      const r = await pronto
      await $.state.set(COMPACTANDO, false)
      $.ui.toast('skip' in r && r.skip ? `Compactação não feita: ${r.skip}` : 'Sessão compactada.')
      const novo = montar(await $.session.usage(), await $.clock.now())
      await $.state.set(USO, novo)
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
                label={ocupado ? textoOcupado : 'Registrar e compactar agora'}
                onPress={() => (ocupado ? undefined : compactar())}
              />
            </Box>
          ) : (
            <Box>
              <Text color={LARANJA}>[ </Text>
              <Button
                key="compactar"
                plain
                label={ocupado ? textoOcupado : 'Registrar e compactar'}
                onPress={() => (ocupado ? undefined : compactar())}
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
