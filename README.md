# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Deployment Checklist

Build the web app before any deployment:

```bash
pnpm install --frozen-lockfile
pnpm run build
```

Deploy `dist/` as one batch. Do not upload only `index.html`, and do not upload only part of `assets/*`.

Recommended order:

1. Upload all new `dist/assets/*`
2. Upload `dist/index.html` last
3. Refresh CDN for `/`, `/index.html`, `/admin`, and all new hashed assets

Verify the hash chain from the build output:

```bash
grep -o 'assets/index-[^"]*.js' dist/index.html
grep -o 'assets/admin-[^"]*.js' dist/assets/index-*.js
grep -o 'assets/AdminChart-[^"]*.js' dist/assets/admin-*.js
```

Verify the live site after deployment:

```bash
curl -I https://web.zice8.com/assets/当前AdminChart文件.js
curl -s https://web.zice8.com/assets/当前AdminChart文件.js | head -20
curl -I https://web.zice8.com/assets/not-exist-zice8-test.js
```

Expected results:

- real JS chunks return `application/javascript`, `text/javascript`, or equivalent JS MIME
- JS chunks must not return `text/html`
- missing `/assets/*.js` must return `404`, not `index.html`

If you use Nginx, keep SPA fallback only on page routes:

```nginx
location /assets/ {
  try_files $uri =404;
}

location / {
  try_files $uri $uri/ /index.html;
}
```
