export type Uso = {
  contexto: number | null
  tokens: number | null
  janela: number
  cincoHoras: { pct: number; reinicia?: string } | null
  semana: { pct: number; reinicia?: string } | null
}

declare module 'claude-code' {
  interface PluginState {
    'barra-de-uso': { uso: Uso | null; compactando: boolean }
  }
}
