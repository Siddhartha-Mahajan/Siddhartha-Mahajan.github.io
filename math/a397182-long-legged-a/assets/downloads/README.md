# A397182 web supplement

Downloadable research artifacts for:

**Siddhartha Mahajan and Paras Chopra, _The Exact Region Formula for Arrangements of Constrained Long-Legged A's_.**

The paper proves, for every integer `n >= 0`,

```text
a(n) = 7 binom(n,2) + floor(n^2/4) + 2n + 1
     = floor((15n^2 - 6n + 4)/4).
```

The all-`n` proof is analytic. The finite rational certificates are independent reproducibility checks and are not logical inputs to the theorem.

## Contents

- `manuscript/a397182-exact-formula.pdf` — publication manuscript.
- `manuscript/a397182-exact-formula.tex` — LaTeX source.
- `manuscript/references.bib` and `manuscript/main.bbl` — bibliography files.
- `certificates/n04.json` through `certificates/n16.json` — exact generic rational equality constructions.
- `certificates/n04-low-height-alternate.json` — a second, simplified rational witness for `a(4)=55`.
- `scripts/verify_certificates.py` — exact verifier for all thirteen primary finite certificates.
- `scripts/verify_parametric_base.py` — exact regression verifier for the rational nongeneric two-family base construction.
- `verification/exact_certificates_n4_n16.json` — archived finite-certificate verification.
- `verification/parametric_base_n2_n64.json` — archived output for balanced sizes `2 <= n <= 64`.
- `SHA256SUMS` — integrity hashes for every other file in this download tree.

## Reproduce the exact checks

Python 3.10 or later is recommended. No third-party package is needed.

```bash
python3 scripts/verify_certificates.py \
  --output verification/exact_certificates_n4_n16.json

python3 scripts/verify_parametric_base.py \
  --max-n 64 \
  --output verification/parametric_base_n2_n64.json
```

The finite verifier checks equal positive leg lengths, positive orientation and radius, every strict component-domain predicate, the balanced seven/eight crossing matrix, absence of cross-shape support-line parallelism, absence of foreign vertex incidences, and global distinctness of all proper crossings.

The expected values for `n=4,...,16` are:

```text
55, 87, 127, 174, 229, 291, 361, 438, 523, 615, 715, 822, 937.
```

## Verify integrity

From this directory, run:

```bash
shasum -a 256 -c SHA256SUMS
```
