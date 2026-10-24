# Avanço manual em filmes sem índice de busca (MKV)

**Data:** 2026-10-24
**Branch:** `master`
**Status:** testado

---

## Antes

### Problema
O usuário relatou que alguns títulos não permitem avançar manualmente no player, por exemplo "A Mulher de Preto 2: Anjo da Morte". Pediu para forçar o avanço em qualquer título.

### Comportamento anterior
Diagnóstico feito no Genymotion com um proxy HTTP temporário (só cabeçalhos, com usuário e senha mascarados):

- O catálogo tem dois itens com esse nome. O item em MP4 (`6199939`) avança normalmente: o arquivo tem o índice `moov` no início, 875 quadros-chave, e o servidor responde `206` a pedidos com `Range`. Testado com +10 s e com toque na barra (21:45 para 1:13:49).
- O item em MKV (`6700856`) passa por três redirecionamentos e termina num armazenamento HTTPS (Cloudflare R2), que também aceita `Range`. Mas o arquivo foi gravado em modo streaming: o `Segment` tem tamanho desconhecido, não existe `SeekHead`, não existe índice `Cues` (nem no início nem nos últimos 4 MB) e o `Info` não traz duração. A API também devolve `duration_secs: 0`.
- Sem `Cues`, o `MatroskaExtractor` do Media3 informa um mapa de busca "não buscável" e duração desconhecida. Resultado no app: a barra fica sem tempo total (o toque na barra é ignorado porque a duração é 0) e o `seekTo` do ExoPlayer é ignorado ou volta ao início.
- No catálogo de 37.007 filmes há 377 MKV, 3 AVI e 111 sem formato informado; o restante é MP4.

Achado secundário no JavaScript: se o usuário avança logo depois de "Continuar de onde parou", a espera da busca inicial (`pendingSeekRef`) pode reaplicar a posição salva e desfazer o avanço do usuário.

### Arquivos que serão alterados
- `node_modules/expo-video/android/src/main/java/expo/modules/video/utils/DataSourceUtils.kt` (usar uma fábrica de extratores própria)
- `node_modules/expo-video/android/src/main/java/expo/modules/video/utils/IndexlessSeekExtractor.kt` (novo: busca aproximada para MKV sem índice)
- `patches/expo-video+57.0.5.patch` (regerado com `patch-package`)
- `src/screens/PlayerScreen.tsx` (avanço do usuário cancela a busca inicial pendente)

---

## Depois

### Comportamento novo
- MKV sem índice agora mostra a duração total e aceita avanço e retrocesso por +10 s, -10 s, toque na barra, teclas de avanço do controle remoto e "Continuar de onde parou".
- Como funciona (no `expo-video`, lado nativo):
  1. A fábrica `IndexlessSeekExtractorsFactory` substitui a fábrica padrão de extratores do Media3. Ela só embrulha o `MatroskaExtractor`; MP4, TS, HLS e os outros formatos seguem como antes. Também liga a busca por taxa constante do Media3 (vale para MP3, AAC/ADTS e AMR).
  2. Se o MKV tiver índice, nada muda. Se o `MatroskaExtractor` informar "não buscável", o extrator segura esse mapa, lê o cabeçalho (escala de tempo e primeiro `Cluster`) e os últimos 4 MB do arquivo para achar o tempo do último `Cluster` e calcular a duração. Isso custa um pedido HTTP extra na abertura.
  3. Publica um mapa de busca aproximado: interpola tempo e posição em bytes entre pontos conhecidos, mirando 8 s antes do alvo.
  4. Em cada busca, procura o próximo `Cluster` válido a partir da posição estimada. Se o tempo encontrado ficar mais de 30 s antes ou mais de 6 s depois do alvo, guarda esse ponto e salta de novo (até 6 vezes). Cada salto melhora a estimativa das buscas seguintes.
- JavaScript: um avanço do usuário cancela a espera da busca inicial de "Continuar de onde parou", que antes podia desfazer o avanço.

### Arquivos alterados
| Arquivo | Alteração |
|---------|-----------|
| `node_modules/expo-video/android/src/main/java/expo/modules/video/utils/IndexlessSeekExtractor.kt` | Novo. Fábrica de extratores, extrator com busca aproximada para MKV sem índice e mapa de busca por interpolação. |
| `node_modules/expo-video/android/src/main/java/expo/modules/video/utils/DataSourceUtils.kt` | `DefaultMediaSourceFactory(context, IndexlessSeekExtractorsFactory())`. |
| `patches/expo-video+57.0.5.patch` | Regerado; contém `DataSourceUtils.kt`, `IndexlessSeekExtractor.kt` e `ResumingInterceptor.kt`. |
| `src/screens/PlayerScreen.tsx` | `seekTo` zera `pendingSeekRef` antes de buscar. |

### Decisões e limitações
- A busca é aproximada, como no VLC: o vídeo recomeça no início do `Cluster` mais próximo (alguns segundos antes do alvo) e o player descarta o trecho até o tempo pedido.
- Cada salto refaz a cadeia de redirecionamentos do provedor (três, neste título), então um salto longo pode levar de 1 a 3 segundos.
- AVI sem índice (3 títulos no catálogo) e FLV continuam sem avanço: não há como recomeçar a leitura no meio desses formatos sem índice.
- Se o servidor não informar o tamanho do arquivo, ou se o fim do arquivo não tiver um `Cluster` reconhecível, o MKV continua sem avanço.
- Supõe que o primeiro tempo útil está no primeiro `Cluster` do cabeçalho; MKV com tempos iniciais muito altos (gravações de TV) foram considerados, mas não testados.
- Para gerar o patch no Windows foi preciso apagar `node_modules/expo-video/android/build` (saída do Gradle, com caminhos longos) e rodar o `patch-package` com `core.autocrlf=false`.

### Verificação
- `npx tsc --noEmit`: sem erros. `npx eslint .`: sem problemas.
- `gradlew assembleRelease` (EXPO_TV=1, armeabi-v7a, arm64-v8a, x86_64): `BUILD SUCCESSFUL`; `classes3.dex` contém `IndexlessSeekExtractorsFactory` e `ResumingInterceptor`.
- Genymotion, "A Mulher de Preto 2: Anjo da Morte" em MKV: duração 1:38:57 aparece; retomou em cerca de 15 min; toque na barra de 16:12 para 1:14:17; -10 s duas vezes (1:14:39, 1:14:29, 1:14:19); toque na barra para trás, para 10:08. Sem erro de reprodução no log.
- Regressão: versão MP4 do mesmo filme retomou em 1:15:47 e tocou; canal ao vivo tocou.
- APK copiado para `C:\Users\Administrador\Downloads\IPTV-Player-1.0.0.apk`.

**Pendente:** testar outros MKV do catálogo (em especial séries), legendas embutidas em MKV sem índice, controle remoto em TV real e conexões lentas.
