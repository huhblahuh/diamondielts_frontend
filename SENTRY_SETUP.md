# Sentry setup

Organization: `diamondsielts`.
Project created: `diamond-ielts-frontend`, platform React (`javascript-react`).
Project ID: `4512397255770112`.
Public DSN: `https://99a08f06e355b84fe868360b7d47290a@o4512397147701248.ingest.us.sentry.io/4512397255770112`.
Sentry MCP is connected. End-to-end API error delivery was verified through the
running app's login form: `Error: API POST /auth/login: 500`.
Issue: <https://diamondsielts.sentry.io/issues/DIAMOND-IELTS-FRONTEND-1>.

## Local development

The public DSN is configured in the gitignored `.env.local` on this checkout.
On another checkout, copy `.env.example` to `.env.local` and set the DSN above.
Run `npm run dev`. Restart Vite whenever environment values change.

The app initializes Sentry only when a DSN is set. It reports errors and samples
browser performance traces at 100% in development and 10% in production by
default. `VITE_SENTRY_TRACES_SAMPLE_RATE` accepts values from 0 to 1, including
0 to disable tracing. Default personal information collection remains disabled.

## Error coverage

- Axios reports all failed API responses (including 4xx and 5xx) and network failures
  before returning the existing popup-friendly error shape.
- Existing handled errors in app screens, file uploads, microphone/audio handling,
  notifications and account settings explicitly call `reportHandledError`.
- MediaRecorder, Soniox and notification connection error callbacks are covered.
- Image/audio/video/script/style resource failures and speech synthesis failures
  are reported without attaching the media or spoken text.
- A root React ErrorBoundary captures render failures and offers a reload button.
- Uncaught JavaScript errors and unhandled promise rejections use the SDK defaults.

Error events are sampled at 100%; performance traces use the separate rate above.
Deliberate request cancellation/AbortError and best-effort resource cleanup are
excluded. Reporting the same error object through nested catches is deduplicated;
API failures are grouped by method, endpoint, status and response code.

API reports include method, endpoint without query parameters, status, network code,
backend error code and request/trace IDs when available. Request/response bodies,
headers, tokens and audio/transcript payloads are not attached. Console/DOM-label
breadcrumbs are excluded; error and trace events are scrubbed before sending.
Sentry organization-side settings may additionally infer IP/geolocation.

For new caught errors, call `reportHandledError(error, 'feature.operation')`.
Do not pass full form values, server responses or audio data as context. Logging
to console alone does not create an issue. This setup covers the frontend runtime;
backend errors need backend instrumentation. Offline devices, blocked ingestion,
Sentry quotas, or errors before SDK startup can still prevent delivery.

## Production

The public DSN is included in `.env.production` and the GitHub Actions Netlify
workflow. An optional repository Actions variable `VITE_SENTRY_DSN` overrides
the workflow's default. The workflow supplies the environment
(`preview` or `production`), a commit-based release, and a 10% trace sample rate.

For builds run directly by Netlify or Vercel, configure `VITE_SENTRY_DSN`,
`VITE_SENTRY_ENVIRONMENT=production`, `VITE_SENTRY_RELEASE` (a unique build or
commit identifier), and `VITE_SENTRY_TRACES_SAMPLE_RATE=0.1` in that host's build
environment. These Vite values are baked into the build; rebuild to apply changes.
Never use a `VITE_` prefix for a Sentry auth token.

## Pending verification and source maps

The local verification event has readable development frames pointing to Login,
Axios and the reporting helper. No temporary test trigger remains in the app.
Tests cover redaction, duplicate suppression, cancellation, HTTP/network failures,
the existing popup contract and expired-session cleanup.

Run: `node --test src/utils/errorReporting.test.mjs src/api/axiosClient.test.mjs src/features/student/audio/SharedWebmAudioSource.test.mjs`.

Production source-map uploads are not configured yet. Before relying on readable
production stack traces, configure the Sentry Vite plugin with the confirmed
project slug and a build-only `SENTRY_AUTH_TOKEN`. Generate hidden source maps,
upload them during the build, and delete the maps before deploying `dist`.
Do not publish source maps or put the upload token in browser environment values.

The frontend Sentry project has been created. No deployment, alert, replay
capture, or backend configuration has been changed.
