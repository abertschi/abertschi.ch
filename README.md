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
/cv/*      -> some old research files
```

There are some old links that point to `/cv/{acai_usenix24.pdf, heckler_usenix24.pdf, weesee_oakland24.pdf}`.
This is why we copy them to `./static/research/` as well as `./static/cv`.

New structure:

```text
/          -> academic profile
/research/ -> redirects to /
/personal/ -> custom webapp
```

Changes:

* The academic profile is copied to `static/index.html`.
* The old personal landing page is moved to `/personal/`.
* The generated personal webapp HTML is stored to `assets/generated/` and embedded by the personal-page template.
* Existing pages and static files keep their original URLs.
* The old `/research/` page is replaced with an HTML redirect to `/`.
* Existing research PDFs are moved to `static/research/` so their URLs remain valid.


