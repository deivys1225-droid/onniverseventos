# Mux Video — API de evaluación (Node.js)

Servidor **independiente** para probar [Mux Live Streams](https://www.mux.com/docs/guides/video/start-live-streaming) sin tocar Supabase ni el frontend de OnniVerso.

## Requisitos

1. Cuenta en [Mux](https://dashboard.mux.com).
2. **Access Token** con permisos **Video Read** y **Video Write**  
   [Settings → Access Tokens](https://dashboard.mux.com/settings/access-tokens)

## Configuración

```bash
cd mux-api
cp .env.example .env
# Editar .env:
#   MUX_TOKEN_ID=...
#   MUX_TOKEN_SECRET=...
npm install
npm run dev
```

## Emisión desde el navegador (WebSocket → RTMP)

`WS /api/mux/ws-ingest?streamKey=YOUR_STREAM_KEY`

El frontend envía chunks WebM (MediaRecorder); este servidor usa **ffmpeg** (incluido vía `ffmpeg-static`) y publica a:

`rtmps://global-live.mux.com:443/app/{streamKey}`

En desarrollo, Vite hace proxy de `/api/mux` (incl. WebSocket) a `:8787`.

## Endpoint

### `POST /api/mux/create-stream`

Crea un live stream en Mux (credenciales en `.env`) y devuelve `stream_key` + `playback_id` para el frontend.

Alias: `POST /api/mux/live-stream` (misma respuesta).

**Body (opcional):**

```json
{ "title": "Transmision_Onniverso" }
```

**Respuesta 201:**

```json
{
  "ok": true,
  "live_stream_id": "abcd1234",
  "stream_key": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "playback_id": "yyyyyyyy",
  "playback_url": "https://stream.mux.com/yyyyyyyy.m3u8",
  "streamKey": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "playbackId": "yyyyyyyy",
  "playbackUrl": "https://stream.mux.com/yyyyyyyy.m3u8",
  "rtmp_ingest_url": "rtmps://global-live.mux.com:443/app",
  "rtmp_push_url": "rtmps://global-live.mux.com:443/app/{stream_key}",
  "status": "idle"
}
```

### Probar con curl

```bash
curl -X POST http://localhost:8787/api/mux/create-stream \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Test OnniVerso\"}"
```

### Emitir

- **OBS / Larix:** servidor `rtmps://global-live.mux.com:443/app`, stream key = `streamKey`.
- **Ver:** abrir `playbackUrl` en VLC o en un reproductor HLS (p. ej. `hls.js`) cuando el live esté activo.

## Estructura

```
mux-api/
  src/
    index.js              # Express + arranque
    lib/muxClient.js      # Cliente Mux + URLs HLS/RTMP
    routes/liveStream.js  # POST /api/mux/create-stream
```

## Notas

- La `stream_key` y el token Mux son **secretos**; no las subas a GitHub.
- Tras la evaluación, puedes integrar esta lógica en tu backend definitivo o mantener un microservicio aparte.
