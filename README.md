# Async vs sync RL on TPU v6e

Async vs sync RL fine-tuning of Qwen3.5-2B on AIME math problems, on Google TPU v6e with TorchTPU + vLLM.

**Live page:** https://ykirpichev.github.io/async-vs-sync-rl-tpu/

## TL;DR

- Async at lag 1 is about 1.7× faster than sync (204–211 vs 359.7 s/step), with no detectable accuracy difference.
- Lag 1 is as fast as lag 2, because the learner is the bottleneck; a second version of lag buys nothing.
- Over 60 steps, truncated importance sampling (IS) reaches 20.2% pass@1 vs 15.4% without it. Keep truncated IS.
- Without IS there was no collapse, but the arm stopped improving after step 40.
- Total cost about $162.5 over four rounds ($22.1 + $64.08 + $21.45 + $54.91).

## Layout

The site is the static page `docs/index.html` with charts in `docs/charts/`, served by GitHub Pages from `main` `/docs`.

Code and raw results are on branch `cursor/qwen38-async-vs-sync-rl-bc4a` under `rl/`.
