# Estado do projeto — IPTV Player

Última atualização: 2026-10-24

## Visão geral

App IPTV para **celular Android e Android TV / TV box** (um único APK), feito em React Native com Expo. O usuário informa URL do servidor, usuário e senha (API **Xtream Codes**), navega por categorias de canais ao vivo, filmes e séries, assiste continuando de onde parou e marca favoritos.

- Local: `C:\projects\reactnative\iptv-app`
- Pacote Android: `com.iptvplayer.app` — versão `1.0.0` (versionCode 1)
- Plano original: `C:\Users\Administrador\.cursor\plans\app_iptv_react_native_185a8e4b.plan.md` (só existe no computador original; todos os itens do plano foram concluídos)
- iOS: não é alvo; nunca foi compilado nem testado.

## Stack e versões

| Item | Versão / valor |
|---|---|
| Expo SDK | 57 (`expo ~57.0.27`) |
| React Native | `react-native-tvos@0.86-stable` (0.86.3-0) via alias npm `"react-native": "npm:react-native-tvos@0.86-stable"` — New Architecture + Hermes |
| React | 19.2.3 |
| Navegação | `@react-navigation/native` 7 + `native-stack` (**não usa Expo Router**) |
| Dados remotos | `@tanstack/react-query` 5 |
| Estado local | `zustand` 5 com `persist` sobre `react-native-mmkv` 4 (`createMMKV`) |
| Credenciais | `expo-secure-store` (chave `iptv.credentials`) |
| Player | `expo-video` (Media3/ExoPlayer no Android) |
| Outros | `expo-image`, `expo-splash-screen`, `expo-screen-orientation`, `expo-build-properties`, `expo-system-ui`, `@react-native-tvos/config-tv` |
| Ambiente de build usado | Node 24.19, npm 11.17, JDK 21 (Temurin), Android SDK em `D:\Android\sdk` (`ANDROID_HOME`) |

## Decisões arquiteturais

1. **Um APK para celular e TV.** `@react-native-tvos/config-tv` com `isTV: true` e `androidTVRequired: false`: o manifest tem LAUNCHER e LEANBACK_LAUNCHER, banner de TV (`assets/tv/tv_banner.png`) e touchscreen/leanback como não obrigatórios. `androidTVIcon` foi removido porque sobrescrevia o ícone do celular.
2. **`react-native-tvos` no lugar de `react-native`**, com `overrides` no `package.json` para `@react-native-tvos/virtualized-lists` usar o mesmo pacote. Sem o override o npm instalava um `react-native` upstream aninhado e sumiam `TVFocusGuideView`/`useTVEventHandler`.
3. **Pasta `android/` é gerada** (CNG) e está no `.gitignore`. Toda configuração nativa vai em `app.json`/plugins. Prebuild **sempre com `EXPO_TV=1`**.
4. **HTTP sem TLS permitido** (`expo-build-properties` → `usesCleartextTraffic: true`): a maioria dos servidores IPTV é `http://`.
5. **Cliente Xtream próprio** (`src/api/xtream.ts`): `player_api.php` para dados; URLs de stream `/{live|movie|series}/{user}/{pass}/{id}.{ext}` com credenciais codificadas; timeout de 20 s; `parseServerInput` aceita só o host, link `get.php?username=&password=` ou URL com `player_api.php`.
6. **Nunca carregar o catálogo inteiro por padrão.** `useStreams` só busca por categoria. O catálogo completo (`useAllStreams`, sem `category_id`) só é carregado quando o usuário busca títulos (≥ 2 letras), fica em cache 30 min e a tela mostra no máximo 300 resultados.
7. **Favoritos e progresso por conta**, chave `url|username` (`accountKeyOf`). Progresso: retomar a partir de 30 s, “assistido” a 95 %, máximo 300 entradas, gravação a cada 10 s, ao pausar, ao sair, ao ir para segundo plano e ao trocar de item.
8. **Player com uma instância só** (`useVideoPlayer(null)` + `replaceAsync`). Mutação do player fica em `src/player/controls.ts` por causa do lint `react-hooks` v6 (proíbe mutar objeto de hook dentro do componente). Refs são atualizadas em `useLayoutEffect`, nunca durante o render.
9. **`playToEnd` só vale depois de `sourceLoad`** (`sourceReadyRef`): o ExoPlayer emite “fim” ao preparar a playlist vazia; sem a guarda, filmes fechavam sozinhos em ~30 ms e eram marcados como assistidos.
10. **Robustez de reprodução** (2026-10-13): User-Agent configurável (padrão **VLC** `VLC/3.0.21 LibVLC/3.0.21`, enviado em `headers` do `VideoSource`); 1 nova tentativa automática por formato; no ao vivo troca HLS↔MPEG-TS; canal ao vivo em `loading` por 20 s conta como falha; erro traduzido por `src/player/errors.ts` com detalhe técnico mascarando usuário/senha.
11. **Splash**: a splash nativa do Android 12+ só aceita ícone central; por isso ela é **preta com ícone transparente** e a foto do usuário (`assets/splash/splash.jpg`) aparece em tela cheia no JS (`BootSplash`) por no mínimo 2 s. A splash nativa só é escondida quando a foto já foi desenhada.
12. **Tela cheia no celular** via `expo-screen-orientation`: “Tela cheia” trava em paisagem; “Sair da tela cheia”/Voltar trava em retrato até sair do player; ao desmontar o player, `unlockAsync`. Modo de ajuste do vídeo (`contain`/`cover`/`fill`) é persistido em `settings`.
13. **Editar lista** (2026-10-13): `signIn` só troca a sessão se o servidor aceitar os novos dados. Se o usuário for o mesmo, `moveAccountData` migra favoritos, progresso e último canal para a nova chave da conta (caso típico: provedor mudou o endereço).
14. **Reconexão transparente no `expo-video` (patch nativo)** (2026-10-13): o CDN do provedor responde 200/206 com o tamanho total, mas às vezes derruba a conexão depois de ~512 KB; o ExoPlayer falha com `ProtocolException: unexpected end of stream`, enquanto VLC/Perfect Player reconectam com `Range`. `ResumingInterceptor.kt` (interceptor OkHttp registrado em `DataSourceUtils.kt`) embrulha o corpo da resposta e, se ela terminar antes da hora, reabre com `Range: bytes=<posição>-<fim>` (primeiro na URL final do redirect, depois na original; aceita só 206 com o `Content-Range` certo; até 5 falhas seguidas). Mantido com `patch-package` (`patches/expo-video+57.0.5.patch`, script `postinstall`). **Obrigatório**: `package.json` → `expo.autolinking.android.buildFromSource: ["expo-video"]`; sem isso o SDK 57 usa o AAR pré-compilado do módulo e o patch não entra no APK. Ao atualizar `expo-video`, refazer o patch para a nova versão.
15. **Foco de TV**: `Focusable` só desenha borda/zoom de foco quando `isTV`; abas da Home ativam ao receber foco na TV; Voltar na Home volta para “Início” antes de sair.
16. **Avanço em MKV sem índice (patch nativo)** (2026-10-24): muitos MKV do provedor são gravados em modo streaming (sem `Cues`, sem duração); o Media3 os trata como não buscáveis. `IndexlessSeekExtractor.kt` (`IndexlessSeekExtractorsFactory`, usado em `DataSourceUtils.kt`) embrulha só o `MatroskaExtractor`: se ele disser "não buscável", lê os últimos 4 MB para achar a duração, publica um mapa de busca aproximado (interpolação tempo/bytes, mira 8 s antes) e em cada busca procura o próximo `Cluster`, refinando com até 6 saltos. MKV com índice e outros formatos não mudam. Também liga a busca por taxa constante do Media3 (MP3/ADTS/AMR). Faz parte de `patches/expo-video+57.0.5.patch`.

## Funcionalidades concluídas

| Funcionalidade | Onde | Verificada no aparelho? |
|---|---|---|
| Login Xtream com sessão salva e login automático (entra offline com dados salvos) | `store/auth.ts`, `screens/LoginScreen.tsx` | Sim (conta real) |
| Home com abas Início, Ao Vivo, Filmes, Séries, Favoritos, Conta; Início com vencimento, último canal, Continuar assistindo e Favoritos | `screens/HomeScreen.tsx` | Sim |
| Categorias e listas (canais em lista, filmes/séries em grade de pôsteres), busca dentro da categoria, toque longo favorita | `CategoriesScreen`, `ItemsScreen`, `components/StreamLists.tsx` | Sim |
| Busca de títulos em todas as categorias + categorias encontradas | `screens/CategoriesScreen.tsx`, `api/queries.ts` | Sim (“vingadores”: 27; “acao”: 4 categorias + 770 títulos) |
| Detalhe de filme (continuar de mm:ss / começar do início) e de série (temporadas, episódios com progresso, próximo episódio) | `MovieDetailScreen`, `SeriesDetailScreen` | Filme sim; série só contra o servidor mock |
| Player: overlay, ±10 s, barra de progresso, troca de canal (▲/▼), EPG curto, áudio/legendas, favoritar, contagem para próximo episódio | `screens/PlayerScreen.tsx` | Ao vivo e filme sim |
| Retomar de onde parou + Continuar assistindo | `store/progress.ts` | Sim |
| Favoritos por conta | `store/favorites.ts`, `FavoritesScreen` | Sim |
| Controle remoto de TV (D-pad, OK, Voltar, Play/Pause, FF/RW) | `tv/useRemote.ts`, `Focusable` | **Não** (sem TV/emulador de TV) |
| Splash com a foto do usuário | `components/BootSplash.tsx`, `App.tsx`, `app.json` | Sim |
| Tela cheia + modos Ajustar/Preencher/Esticar | `PlayerScreen.tsx`, `store/settings.ts` | Sim |
| Sair da conta | `SettingsScreen.tsx` | Não testado no aparelho |
| Identificação do player (VLC, IPTV Smarters, Navegador, Padrão) + novas tentativas + erros claros | `store/settings.ts`, `player/source.ts`, `player/errors.ts`, `PlayerScreen.tsx` | **Não** (compilado, não testado) |
| Avanço em MKV sem índice (duração estimada pelo fim do arquivo + busca aproximada) | `expo-video` patch `IndexlessSeekExtractor.kt`, `PlayerScreen.tsx` | Sim (MKV “A Mulher de Preto 2”) |
| Editar lista (URL, usuário, senha) pela aba Conta | `screens/EditPlaylistScreen.tsx`, `components/PlaylistForm.tsx`, `store/moveAccountData.ts` | **Não** (compilado, não testado) |

## Arquivos relevantes

- `App.tsx` — providers, splash JS, restauração da sessão.
- `app.json` — plugins (secure-store, image, build-properties, video, config-tv, splash-screen, screen-orientation).
- `src/api/` — `xtream.ts` (cliente e URLs), `queries.ts` (React Query; `useStreams`, `useAllStreams`), `types.ts`.
- `src/store/` — `auth.ts`, `favorites.ts`, `progress.ts`, `settings.ts` (formato ao vivo, ajuste de vídeo, identificação do player), `storage.ts` (MMKV), `moveAccountData.ts`.
- `src/player/` — `source.ts` (VideoSource + User-Agent), `errors.ts`, `controls.ts`, `episodes.ts`, `types.ts`.
- `src/screens/PlayerScreen.tsx` — tela mais complexa (carregamento, falhas, progresso, controles, TV, tela cheia).
- `src/components/` — `Focusable` (base de foco TV), `AppButton`, `StreamLists`, `PosterGrid`, `PlaylistForm`, `BootSplash`, `BackButton`.
- `scripts/` — `smoke-xtream.ts` (`npm run test:smoke`), `mock-xtream-server.mjs` (porta 8080, usuário `teste`, senha `1234`), `generate-tv-assets.ps1`.
- `.screens/` — capturas dos testes no Genymotion (contêm dados da conta do usuário; **não publicar**).

## Build e ambiente

```powershell
cd C:\projects\reactnative\iptv-app
npm install
# Só quando mudar app.json, plugins ou dependências nativas (ou em máquina nova):
$env:EXPO_TV='1'; npx expo prebuild --platform android --clean
# APK release (mudanças só de JS precisam apenas disto):
cd android; $env:EXPO_TV='1'; .\gradlew.bat assembleRelease "-PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86_64"
# Saída: android\app\build\outputs\apk\release\app-release.apk (~69 MB)
```

- Verificações obrigatórias antes de concluir: `npx tsc --noEmit` e `npx eslint .`.
- **Não** encadear o Gradle em `| Select-Object -First N`: o PowerShell encerra o pipeline e mata o build. Redirecione para arquivo (`*> $env:TEMP\iptv-gradle.log`) e filtre depois.
- Para confirmar o patch do `expo-video` no APK: o log deve ter `:expo-video:compileReleaseKotlin` e algum `classes*.dex` do APK deve conter a string `ResumingInterceptor`.
- Não há `android/local.properties`; o Gradle usa a variável `ANDROID_HOME`.
- O APK release é assinado com a **chave debug** (serve para instalar manualmente, não para Play Store).
- Genymotion usado nos testes: `192.168.187.101:5555` (Android 15, x86_64, 570x1230). `adb install -r` mantém o login. Coordenadas de toque = coordenadas da captura × 1,2.
- Emulador oficial do Android não roda nesta máquina (sem driver de hipervisor).

## Testes executados

| Data | Teste | Resultado |
|---|---|---|
| 2026-10-07 | `tsc --noEmit`, `eslint .`, `expo-doctor` (21/21), `test:smoke` contra o mock | OK |
| 2026-10-07 | `aapt2 dump badging`: launcher + leanback, banner, touchscreen não obrigatório, ABIs arm64-v8a/armeabi-v7a/x86_64, minSdk 24, targetSdk 36 | OK |
| 2026-10-07 | Genymotion com conta real: login, canais ao vivo, filme 4K HDR, retomar, tela cheia, modos de ajuste, splash, busca de títulos | OK |
| 2026-10-13 | `tsc --noEmit`, `eslint .`, `assembleRelease` com identificação do player, novas tentativas e Editar lista | OK (sem teste no aparelho: emulador desligado) |
| 2026-10-13 | Genymotion, filme “Pânico no Lago: O Legado” com `ProtocolException: unexpected end of stream`: proxy de diagnóstico mostrou o CDN cortando a conexão em ~512 KB (intermitente); com o proxy “costurando” por `Range` o filme tocou | Causa confirmada |
| 2026-10-13 | `assembleRelease` com `ResumingInterceptor` (expo-video compilado do fonte), `tsc`, `eslint`; `classes3.dex` contém `ResumingInterceptor` | OK (sem teste no aparelho) |
| 2026-10-24 | Diagnóstico “A Mulher de Preto 2”: versão MP4 avança; versão MKV sem `Cues`/duração não avançava | Causa confirmada |
| 2026-10-24 | `tsc`, `eslint`, `assembleRelease` com `IndexlessSeekExtractor`; Genymotion: MKV mostra 1:38:57, retoma, avança/volta pela barra e ±10 s; MP4 e canal ao vivo sem regressão | OK |

## Problemas conhecidos e limitações

- **Alguns canais/vídeos falham e abrem no Perfect Player** (relato de 2026-10-13). Uma causa confirmada: o CDN corta a conexão em ~512 KB (`unexpected end of stream`), tratada pelo `ResumingInterceptor` (decisão 14, ainda não validada no aparelho). Outras mitigações: User-Agent VLC, novas tentativas, troca de formato, timeout de 20 s. Se continuar, coletar nome do conteúdo + “Detalhe técnico” do diálogo de erro.
- **Diagnóstico por proxy**: para ver o que o servidor faz, rodar um proxy HTTP Node no PC (porta 8899) e no emulador `adb shell settings put global http_proxy 192.168.187.2:8899` (IP do PC na rede do Genymotion). **Sempre** desfazer com `settings put global http_proxy :0`. Não registrar tokens/JWT nem credenciais vistos no log.
- **Avanço sem índice**: MKV sem `Cues` agora avança (busca aproximada, recomeça alguns segundos antes do alvo; cada salto refaz os redirecionamentos do provedor, 1 a 3 s). AVI/FLV sem índice continuam sem avanço. MKV sem tamanho informado pelo servidor também.
- **Codecs**: `expo-video` usa só decodificadores do Android. Áudio MP2/AC3/E-AC3/DTS e vídeo HEVC 10 bits/4K dependem do aparelho (o Perfect Player traz decodificadores próprios). Resolver exigiria extensão FFmpeg do Media3 ou outro player nativo.
- **Limite de conexões** da conta (`max_connections`): o servidor recusa se outro app/aparelho estiver assistindo.
- Android TV/TV box **nunca testado em aparelho real**; foco com D-pad pode ter ajustes pendentes.
- Busca de títulos baixa o catálogo inteiro na primeira vez (alguns segundos; uso de memória alto em catálogos muito grandes).
- Após “Sair da tela cheia”, o player fica em retrato até ser fechado (intencional).
- Splash nativa (Android 12+) é só preta por uma fração de segundo antes da foto.
- Só uma lista por vez e só Xtream (sem M3U puro, sem múltiplas listas, sem ocultar/reordenar categorias). Em 2026-10-13 o usuário escolheu apenas “editar URL/usuário/senha”.
- Log `ExpoVideo: Current activity does not support picture-in-picture` é esperado (PiP desativado).
- `AGENTS.md` original era o template do Expo e citava Expo Router; foi corrigido para apontar esta memória.

## Backlog

1. Testar outros MKV (séries, legendas embutidas) com o avanço aproximado e o “Editar lista” (ver `HANDOFF.md`).
2. Diagnosticar com o usuário os conteúdos que ainda falham (nome + detalhe técnico).
3. Testar em TV box real (Mi TV Box) via `adb connect <ip>:5555` e ajustar foco do D-pad.
4. Keystore de release própria + incremento de `versionCode` antes de distribuir.
5. Adicionar `.screens/` ao `.gitignore` e fazer o primeiro commit do trabalho (o repositório só tem o commit inicial e não tem remoto).
6. Opcional, se o usuário pedir: múltiplas listas, M3U, organizar categorias, decodificadores FFmpeg.
