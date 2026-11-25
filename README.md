![banner](assets/banner.svg)

# bloodline

Turn any GitHub profile into a shareable stats card — followers, repos, stars, top languages, and account age.

## Features

- **Live GitHub lookup** — enter a username and fetch public data from the GitHub REST API (`/users/<name>` and `/users/<name>/repos`), no token needed.
- **Shareable stats card** — avatar, name, bio, followers/following, public repos, total stars, top languages with percentage bars, most-starred repo, and account age.
- **Copy share text** — one click copies a compact summary line for posting anywhere.
- **Graceful sample mode** — if the fetch fails (offline, 404, or API rate limit), a clear message explains what happened and a built-in sample card (MrVempiree) is one click away.
- **Vempire theme** — dark crimson/black glass design with bat motifs.
- **Zero dependencies** — plain HTML, CSS, and vanilla JavaScript modules.

## Usage

Open `index.html` in a browser (or serve the folder with any static server):

```bash
npx serve .
```

Then enter a GitHub username and hit **Generate card**. Use **View sample card** to preview the design offline.

## Tests

Tests use fixture JSON only — no network access required:

```bash
node --test
```

They cover summary math (star/fork totals, account age), language ranking, card formatting, and the built-in sample data shape.

## License

MIT © Lavish Gangwar — see [LICENSE](LICENSE).
