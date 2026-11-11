# Async vs sync RL rollouts on TPU v6e

Engineering study: **GRPO on Qwen3.5-2B / AIME** comparing synchronous and asynchronous (staleness ≤ 2) rollouts on a Flex-start TPU v6e-4 with TorchTPU + vLLM.

**Live page:** https://ykirpichev.github.io/async-vs-sync-rl-tpu/

## TLDR

| | Sync | Async k=2 |
|---|---|---|
| Wall-clock to 40 steps | 85.4 min | **53.0 min (1.61×)** |
| Rollout idle | 39.5% | **1.7%** |
| Gen tokens/s | 2,902 | 4,698 |
| pass@1 @ step 40 | 9.38% | 8.96% (within noise) |

Base pass@1: 7.08%. Cost ≈ **$22**. This is a short, weak-signal run: the speed result is solid; "equal quality" means no detectable gap at this scale.

## Related work (citations)

1. **Miles** — Yuan, Yueming. "Miles: RL post-training for the new era of scale and workloads." *PyTorch Conference 2026*. [Slides](https://cdn.sessionize.com/download/idgayrey~KCRhB3suN75AnPeiMM36R3.pdf~miles_pytorchconf_2026.pdf) · [Blog](https://pytorch.org/blog/miles-a-pytorch-native-stack-for-large-scale-llm-rl-post-training/)
2. **TorchStore / AsyncRL** — Pasqualin et al. "TorchStore: What We Learned Building Distributed Storage Solutions for AsyncRL." *PyTorch Conference Europe 2026*. [Session](https://pytorchconferenceeu2026.sched.com/event/2HioY/torchstore-what-we-learned-building-distributed-storage-solutions-for-aysncrl-lucas-pasqualin-danielle-pintz-allen-wang-amir-afzail-meta) · [GitHub](https://github.com/meta-pytorch/torchstore)
3. **torchforge** — PyTorch Blog, 23 Oct 2025. [Post](https://pytorch.org/blog/introducing-torchforge/)
4. **HF AsyncGRPO** — `AsyncGRPOTrainer` in [huggingface/trl](https://github.com/huggingface/trl); agentic RL sessions at PyTorch Conf NA 2026.

## Reproduce

Code on branch `cursor/qwen38-async-vs-sync-rl-bc4a` under `rl/`.
