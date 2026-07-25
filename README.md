# abertschi.ch
[![build-and-deploy](https://github.com/abertschi/abertschi.ch/actions/workflows/deploy-hetzner.yml/badge.svg)](https://github.com/abertschi/abertschi.ch/actions/workflows/deploy-hetzner.yml)

This site stores assets for abertschi.ch

![Intro Site](https://raw.githubusercontent.com/abertschi/abertschi.ch/master/.github/out.gif)

Content © by Andrin Bertschi, unless otherwise noted.


## Merge with academic website

Old structure (stored in branch old-layout)

```text
/          -> custom webapp
/research/ -> Hugo research page
```

New structure:

```text
/          -> academic profile
/research/ -> redirects to /
/personal/ -> custom webapp
```

Changes:

* The standalone academic profile is copied to `static/index.html`.
* The old Hugo homepage is moved to `/personal/`.
* The generated webapp HTML is stored under `assets/generated/` and embedded by the personal-page template.
* Existing pages and static files keep their original URLs.
* The old `/research/` page is replaced with an HTML redirect to `/`.
* Existing research PDFs are moved to `static/research/` so their URLs remain valid.
