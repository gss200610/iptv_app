export interface PlaybackProblem {
  message: string;
  detail: string;
}

const RULES: { test: RegExp; message: string }[] = [
  {
    test: /response code:?\s*(401|403)|\b(401|403)\b.*(forbidden|unauthorized)/i,
    message:
      'O servidor recusou o acesso. Pode ser o limite de conexões da conta (outro aparelho assistindo) ou bloqueio do player — tente outra "Identificação do player" em Conta.',
  },
  {
    test: /response code:?\s*(429|456|458|509)/i,
    message: 'Limite de conexões da conta atingido. Feche o conteúdo em outros aparelhos ou apps e tente de novo.',
  },
  { test: /response code:?\s*404/i, message: 'O conteúdo não foi encontrado no servidor (404).' },
  { test: /response code:?\s*5\d\d/i, message: 'O servidor do provedor está com problema no momento.' },
  {
    test: /unrecognizedinputformat|none of the available extractors|parserexception|malformed/i,
    message: 'O servidor enviou um formato que este player não reconhece.',
  },
  {
    test: /decoder|mediacodec|codec|exceeds_capabilities|format_supported/i,
    message: 'Este aparelho não consegue decodificar o vídeo (codec não suportado, como HEVC 10 bits ou 4K).',
  },
  {
    test: /behindlivewindow/i,
    message: 'A transmissão ao vivo se perdeu. Toque em tentar novamente.',
  },
  {
    test: /n[aã]o come[cç]ou a transmitir/i,
    message: 'O canal não começou a transmitir em 20 segundos. Ele pode estar fora do ar ou sobrecarregado.',
  },
  {
    test: /timeout|timed out|unable to connect|unknownhost|connection|socket|network|cleartext/i,
    message: 'Não foi possível conectar ao servidor do vídeo.',
  },
];

/** Remove usuário e senha das URLs Xtream antes de exibir a mensagem técnica. */
function maskCredentials(text: string): string {
  return text
    .replace(/(\/(?:live|movie|series)\/)[^/\s]+\/[^/\s]+\//gi, '$1***/***/')
    .replace(/(username|password)=[^&\s"]+/gi, '$1=***');
}

export function describePlaybackError(raw: string | undefined | null): PlaybackProblem {
  const detail = maskCredentials((raw ?? '').trim());
  const rule = RULES.find((r) => r.test.test(detail));
  return {
    message: rule?.message ?? 'Não foi possível reproduzir este conteúdo.',
    detail,
  };
}
