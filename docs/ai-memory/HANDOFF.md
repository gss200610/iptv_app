# Handoff da sessão

- Data: 2026-10-24
- Projeto: `C:\projects\reactnative\iptv-app` (branch `master`, sem remoto, nada commitado além do commit inicial)
- APK mais recente: `android\app\build\outputs\apk\release\app-release.apk`, copiado para `C:\Users\Administrador\Downloads\IPTV-Player-1.0.0.apk` (2026-10-24 10:47), **instalado no Genymotion**.

## O que foi feito nesta sessão

**Avanço manual em MKV sem índice** (relato: "A Mulher de Preto 2: Anjo da Morte" não deixava avançar). Documento: `docs/alteracoes/2026-10-24-avanco-forcado-player.md`.

- O catálogo tem duas versões do título. A MP4 (`6199939`) sempre avançou. A MKV (`6700856`) foi gravada em modo streaming: sem `Cues`, sem `SeekHead`, `Segment` de tamanho desconhecido e sem duração (a API também diz `duration_secs: 0`). O Media3 marca o arquivo como não buscável, então o app mostrava duração 0 e o `seekTo` era ignorado.
- Correção nativa no `expo-video` (patch): `IndexlessSeekExtractor.kt` com `IndexlessSeekExtractorsFactory`, usado em `DataSourceUtils.kt`. Só embrulha o `MatroskaExtractor`; quando ele diz "não buscável", lê o fim do arquivo para achar a duração, publica um mapa aproximado (interpolação tempo/bytes) e, em cada busca, procura o próximo `Cluster` e refina com até 6 saltos.
- Correção JS: `seekTo` no `PlayerScreen` zera `pendingSeekRef` (o avanço do usuário não é mais desfeito pela retomada pendente).
- Catálogo do usuário: 37.007 filmes, 377 MKV, 3 AVI, 111 sem formato informado.

Verificado no Genymotion: MKV mostra 1:38:57, retoma, avança pela barra (16:12 para 1:14:17), -10 s e volta pela barra (para 10:08). Regressão: MP4 e canal ao vivo tocam. `tsc`, `eslint` e `assembleRelease` passaram.

As entregas de 2026-10-13 também ficaram validadas na prática nesta sessão: o APK com `ResumingInterceptor`, User-Agent VLC e novas tentativas foi instalado e filmes/canal tocaram. "Editar lista" continua sem teste.

## Próximo passo exato

1. Pedir ao usuário para testar outros MKV (inclusive episódios de série) e avisar se algum título ainda não avança; anotar nome e formato.
2. Testar MKV sem índice com legendas embutidas (o extrator novo repassa as configurações de legenda ao Media3, mas não foi testado).
3. Testar **Editar lista** (aba Conta): mesmos dados mantêm favoritos e Continuar assistindo; senha errada mostra erro.
4. Atualizar `HANDOFF.md` e `PROJECT_STATE.md` ao final.

## Preparar outro computador

1. Copiar o projeto **sem** `node_modules/` e `android/` (são gerados), mas **com** `patches/`. Antes de publicar em repositório remoto, adicionar `.screens/` ao `.gitignore`: as capturas mostram dados da conta. A foto em `assets/splash/splash.jpg` é pessoal; evitar repositório público.
2. Instalar Node 24+, JDK 21 e Android SDK (platform-tools, build-tools, platform 36); definir `ANDROID_HOME` e `JAVA_HOME`.
3. `npm install` (o `postinstall` aplica o patch do `expo-video`; confira `expo-video@57.0.5 ✔`) e depois `$env:EXPO_TV='1'; npx expo prebuild --platform android --clean`.
4. `cd android; .\gradlew.bat assembleRelease "-PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86_64" --console=plain *> $env:TEMP\iptv-gradle.log` (não encadear em `Select-Object -First`; isso mata o build).
5. Rodar `npx tsc --noEmit` e `npx eslint .` para confirmar o ambiente.
6. O login do usuário fica no aparelho (SecureStore), não no projeto.

## Cuidados

- Não editar `android/` à mão; configurar por `app.json`/plugins e refazer o prebuild com `EXPO_TV=1`.
- Instalar dependências com `npx expo install <pacote>`. Ao mexer no `expo-video`, regerar o patch assim (no Windows): apagar `node_modules\expo-video\android\build` (`cmd /c rd /s /q "\\?\<caminho>"`) e rodar `npx patch-package expo-video` com `GIT_CONFIG_COUNT=2`, `core.autocrlf=false` e `core.safecrlf=false` nas variáveis `GIT_CONFIG_KEY_n`/`GIT_CONFIG_VALUE_n`. Sem isso o `patch-package` falha.
- O usuário testa no mesmo emulador ao mesmo tempo: avisar antes de tocar na tela ou reinstalar.
- Proxy de diagnóstico: sempre desfazer com `adb shell settings put global http_proxy :0` (feito nesta sessão). O log do proxy contém URLs com token do CDN; apagar ao terminar.
- No player, um toque na tela com o overlay visível o esconde; para testar pela linha de comando, tocar e capturar no mesmo `adb shell "input tap ...; sleep 0.6; screencap ..."`.
- Não fazer commit sem o usuário pedir.
