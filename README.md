# siddhartha-mahajan.github.io

Personal site of Siddhartha Mahajan: https://siddhartha-mahajan.github.io/

Software engineer and AI researcher. The site collects projects, work experience, math results (OEIS contributions, proofs and Lean formalizations), publications and education. It is static HTML and CSS served by GitHub Pages, with no build step.

## Layout

| Path | Contents |
|------|----------|
| `index.html` | Home page |
| `math/a397182-long-legged-a/` | Proof page for OEIS A397182, with manuscript, certificates and verification scripts |
| `math/a003829-unit-circles/` | Visual proof for the n=9 value of OEIS A003829 |
| `math/connected-still-life-problem/` | Connected Still Life problem statement (CAISc 2026) |
| `papers/extremal-connected-still-lifes/` | Paper landing page and PDF |
| `problems/` | Verifiable Problems pages (CAISc 2026) |
| `sitemap.xml`, `robots.txt` | Search engine files |
| `assets/` | Logos and the link-preview image |

## Run locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000/.

## License

Code is MIT licensed, see `LICENSE`. Papers, manuscripts, figures and written content are by their authors; ask before reusing them.
