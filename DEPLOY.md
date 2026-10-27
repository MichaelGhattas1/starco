# Deploy Starco

Starco is an Angular site. The production build is a folder of static files. The hotel data, login, and payments come from the Plaza Inn API at `http://plazainn.runasp.net`. That API is not part of this repository.

## Before you publish

1. Install Node.js 20.19 or newer, then install dependencies from the project folder:

```bash
npm ci
```

2. Build the site:

```bash
npm run build
```

3. Publish the folder `dist/starco/browser`. Do not publish the whole `dist` folder. `index.html` must sit at the site root.

`npm run build` uses the production configuration. The API address is set in `src/app/core/environment.ts`.

## Keep every page on refresh

The site uses client-side routes such as `/hotels` and `/contact`. The host must serve `index.html` for those paths, or a refresh returns 404.

`public/_redirects` is copied into the build for Netlify:

```
/*    /index.html   200
```

On IIS or MonsterASP, use this `web.config` inside `dist/starco/browser`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Angular routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

On nginx:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Netlify

1. Create a site from this Git repository.
2. Set the build command to `npm run build`.
3. Set the publish directory to `dist/starco/browser`.
4. Leave the base directory empty.
5. Deploy. Netlify reads `_redirects` from the published folder.

There is no `netlify.toml`. The dashboard settings above are enough.

## HTTPS and the API

Netlify serves the site over HTTPS. The API address in `environment.ts` is still `http://plazainn.runasp.net`. A browser will block those calls from an HTTPS page until the API answers on HTTPS.

Do not change `apiUrl` to `https://plazainn.runasp.net` until this returns the hotel list:

```bash
curl.exe -I https://plazainn.runasp.net/api/Hotel
```

A connection reset means the certificate is not ready. Login and images will fail if the site is switched early.

On MonsterASP, enable HTTPS for `plazainn.runasp.net` in the control panel, then turn on the HTTPS redirect only after the HTTPS hotel URL returns 200. After that, change `apiUrl` in `src/app/core/environment.ts` to `https://plazainn.runasp.net` and build again. Image links stored as `http://plazainn.runasp.net/...` are upgraded automatically when the API base is HTTPS.

## Allow the live site in CORS

The API only accepts browser calls from origins it already allows. `http://localhost:4200` is allowed for local development. After the first deploy, add the real site origin, for example `https://your-site.netlify.app`, to the API allow-list. A custom domain must be added too.

The API does not use cookies for the Plaza session. The token stays in the browser. Do not turn on credential sharing for a wildcard origin.

## After it is live

Open the home page, then open a hotel, a trip, and the contact page directly by URL. Each of those must load, not show the host 404 page. Sign-in only works after CORS allows the live origin and the API URL is reachable from that page.
