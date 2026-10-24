# IPTV Player (Android celular + Android TV)

Reprodutor IPTV em React Native (Expo SDK 57 + `react-native-tvos`). Um único APK funciona no celular Android e no Android TV / TV Box / Fire TV.

O app não traz nenhum conteúdo: o usuário informa a URL, o usuário e a senha do próprio provedor (API Xtream Codes).

## Funcionalidades

- Login com URL, usuário e senha (aceita também colar um link M3U `get.php?username=...&password=...`), salvo no SecureStore com login automático.
- Abas Início, Ao Vivo, Filmes, Séries, Favoritos e Conta.
- Categorias com busca, lista de canais e grade de filmes e séries com busca.
- Detalhe de filme e de série (temporadas, episódios, progresso de cada episódio).
- Player (`expo-video`, Media3/ExoPlayer) com controles próprios, avançar e voltar 10 s, troca de canal (setas para cima e para baixo no controle), EPG atual e próximo, faixas de áudio e legenda.
- Continuar de onde parou: progresso salvo a cada 10 s, ao pausar, ao sair e ao trocar de item. Pergunta "Continuar de mm:ss" ou "Começar do início". Linha "Continuar assistindo" na Início. Próximo episódio automático com contagem regressiva.
- Favoritos por conta (pressão longa nas listas ou botão de estrela).
- Canais ao vivo em HLS (`.m3u8`) ou MPEG-TS (`.ts`), com troca automática para o outro formato se o primeiro falhar.

## Requisitos

- Node.js LTS
- JDK 17 ou superior
- Android SDK (variável `ANDROID_HOME`, por exemplo `D:\Android\sdk`)

## Rodar em desenvolvimento

```powershell
npm install
$env:EXPO_TV = '1'
npx expo prebuild --platform android --clean
npx expo run:android
```

Não use o Expo Go: o app tem módulos nativos (MMKV, expo-video) e precisa de build próprio.

## Gerar APK release

```powershell
$env:EXPO_TV = '1'
npx expo prebuild --platform android --clean
cd android
.\gradlew.bat assembleRelease "-PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86_64"
```

O APK fica em `android/app/build/outputs/apk/release/app-release.apk`. O projeto gerado assina o release com a chave de debug; para publicar na Play Store, configure uma chave própria (ou use `npx eas-cli@latest build -p android`).

A pasta `android/` é gerada pelo prebuild e não deve ser editada à mão: configurações nativas ficam no `app.json`.

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| `src/api` | Cliente Xtream (`xtream.ts`), tipos e hooks React Query (`queries.ts`) |
| `src/store` | Zustand + MMKV: sessão, favoritos, progresso, configurações |
| `src/screens` | Login, Home, Categorias, Itens, Detalhes, Player, Favoritos, Conta |
| `src/components` | Itens focáveis, capas, linhas de canal, diálogos |
| `src/player` | Tipo do item reproduzível, URL de reprodução, episódios |
| `src/tv` | Hook do controle remoto |

## Observações técnicas

- `package.json` tem um `overrides` para `@react-native-tvos/virtualized-lists`: sem ele o npm instala uma segunda cópia do React Native original dentro de `node_modules/react-native`, o que quebra os tipos de TV e pode duplicar o RN no bundle.
- O `app.json` libera HTTP sem TLS (`usesCleartextTraffic`), porque a maioria dos servidores IPTV usa `http://`.
- O banner do launcher da TV (320x180) é gerado por `scripts/generate-tv-assets.ps1`.
