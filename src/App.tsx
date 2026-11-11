const CHART = {
  wallclock: `${import.meta.env.BASE_URL}charts/wallclock.png`,
  idle: `${import.meta.env.BASE_URL}charts/idle_fractions.png`,
  timeline: `${import.meta.env.BASE_URL}charts/timeline.png`,
  reward: `${import.meta.env.BASE_URL}charts/reward_curves.png`,
  eval: `${import.meta.env.BASE_URL}charts/eval_pass1.png`,
  staleness: `${import.meta.env.BASE_URL}charts/staleness.png`,
}

function Figure({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="figure">
      <img src={src} alt={alt} loading="lazy" />
      <figcaption className="caption">{caption}</figcaption>
    </figure>
  )
}

export default function App() {
  return (
    <>
      <nav className="nav" aria-label="Sections">
        <div className="nav-inner">
          <a href="#tldr">TLDR</a>
          <a href="#setup">Setup</a>
          <a href="#results">Results</a>
          <a href="#related">Related work</a>
          <a href="#caveats">Caveats</a>
          <a href="#refs">References</a>
        </div>
      </nav>

      <main className="shell">
        <header>
          <p className="eyebrow">TPU Builders study</p>
          <h1 className="brand">Async vs sync RL rollouts on TPU v6e</h1>
          <p className="lede">
            A controlled GRPO comparison on Qwen3.5-2B / AIME: overlapping generation and learning with
            bounded staleness cuts wall-clock by <strong>1.61×</strong> without a measurable quality gap
            at this scale — the same systems thesis as Miles and PyTorch Conf async-RL talks, measured
            on TorchTPU + vLLM.
          </p>
          <div className="meta">
            <span className="pill">Qwen3.5-2B · GRPO · AIME</span>
            <span className="pill">Flex-start v6e-4 · asia-northeast1-b</span>
            <span className="pill">40 steps · 2 seeds · k≤2</span>
            <span className="pill">≈ $22 total</span>
          </div>
        </header>

        <section id="tldr">
          <p className="eyebrow">Summary</p>
          <h2>TLDR</h2>
          <div className="kpis">
            <div className="kpi">
              <div className="label">Speedup</div>
              <div className="value">1.61×</div>
              <div className="detail">53.0 vs 85.4 min to 40 steps</div>
            </div>
            <div className="kpi">
              <div className="label">Rollout idle</div>
              <div className="value">1.7%</div>
              <div className="detail">down from 39.5% in sync</div>
            </div>
            <div className="kpi">
              <div className="label">pass@1 @40</div>
              <div className="value">≈ equal</div>
              <div className="detail">8.96% async vs 9.38% sync</div>
            </div>
            <div className="kpi">
              <div className="label">Mean staleness</div>
              <div className="value">1.09</div>
              <div className="detail">cap k=2; 89% of steps at 1</div>
            </div>
          </div>

          <div className="callout" style={{ marginTop: "1.2rem" }}>
            <p style={{ marginTop: 0 }}>
              <strong>Bottom line.</strong> Async keeps the rollout engine busy while the learner trains.
              Throughput rose from ~2,900 to ~4,700 gen tokens/s. AIME 2024+2025 pass@1 (60 problems × 8
              samples, mean of 2 seeds) stayed within noise (async − sync at step 40: −0.4 pp, 95% CI −2.1
              to +1.2). Base model was 7.08%. This is a short, weak-signal run: the <em>speed</em> result is
              solid; “equal quality” means no detectable difference at this scale, not long-horizon
              equivalence.
            </p>
          </div>
        </section>

        <section id="setup">
          <p className="eyebrow">Method</p>
          <h2>Setup</h2>
          <div className="table-wrap">
            <table>
              <tbody>
                <tr>
                  <th>Model</th>
                  <td>
                    <span className="mono">Qwen/Qwen3.5-2B</span>, non-thinking chat template
                  </td>
                </tr>
                <tr>
                  <th>Hardware</th>
                  <td>
                    1× <span className="mono">ct6e-standard-4t</span> (TPU v6e-4), Flex-start,
                    asia-northeast1-b. Sync and async of each seed ran concurrently on chip pairs 0/1 and
                    2/3.
                  </td>
                </tr>
                <tr>
                  <th>Stack</th>
                  <td>
                    <span className="mono">vllm/vllm-torchtpu:v0.32.0</span> — torch 2.13, torch_tpu 0.2,
                    vLLM 0.32
                  </td>
                </tr>
                <tr>
                  <th>Data / algo</th>
                  <td>
                    Train AIME 1983–2023; eval AIME 2024+2025. GRPO with exact boxed-answer match reward.
                    16 prompts × 8 samples, max 3,072 new tokens, 40 steps, seeds 0 and 1.
                  </td>
                </tr>
                <tr>
                  <th>Loss</th>
                  <td>
                    Truncated importance sampling:{" "}
                    <span className="mono">w = min(exp(logp_cur − logp_beh), 2)</span>, detached; token-mean
                    over nonzero-advantage sequences.
                  </td>
                </tr>
                <tr>
                  <th>Async rule</th>
                  <td>
                    Batch b trains at step b under policy version b. Rollout may start batch b once version
                    ≥ b−k (k=2). No weight snapshots stored; learner recomputes log-probs; weights pushed as
                    safetensors on <span className="mono">/dev/shm</span> (~1.8 s in-place vLLM reload).
                    Sync is the same code with k=0.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="results">
          <p className="eyebrow">Measurements</p>
          <h2>Results</h2>

          <h3>Speed and utilization</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Wall to 40</th>
                  <th>s/step</th>
                  <th>Gen tok/s</th>
                  <th>Rollout idle</th>
                  <th>Learner idle</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>sync (mean)</td>
                  <td>85.4 min</td>
                  <td>128.1</td>
                  <td>2,902</td>
                  <td>39.5%</td>
                  <td>60.4%</td>
                </tr>
                <tr>
                  <td>async k=2 (mean)</td>
                  <td>53.0 min</td>
                  <td>79.5</td>
                  <td>4,698</td>
                  <td>1.7%</td>
                  <td>36.4%</td>
                </tr>
                <tr>
                  <td>
                    <strong>speedup</strong>
                  </td>
                  <td>
                    <strong>1.61×</strong>
                  </td>
                  <td colSpan={4} />
                </tr>
              </tbody>
            </table>
          </div>

          <Figure
            src={CHART.wallclock}
            alt="Wall-clock to N steps for sync and async"
            caption="Figure 1. Wall-clock to N steps. Async reaches step 40 when sync is around step 25."
          />
          <div className="grid-2">
            <Figure
              src={CHART.idle}
              alt="Idle fractions for rollout and learner"
              caption="Figure 2. Idle fractions. Async nearly eliminates rollout idle."
            />
            <Figure
              src={CHART.timeline}
              alt="Timeline of generate, train, and weight publish"
              caption="Figure 3. First 15 minutes: green = generate, purple = train, orange = weight sync."
            />
          </div>

          <h3>Learning quality</h3>
          <p>
            Train-reward curves overlap step-for-step. Eval pass@1 (AIME 2024+2025 combined):
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Step 20</th>
                  <th>Step 40</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>sync (mean of 2 seeds)</td>
                  <td>8.65%</td>
                  <td>9.38%</td>
                </tr>
                <tr>
                  <td>async k=2</td>
                  <td>9.38%</td>
                  <td>8.96%</td>
                </tr>
                <tr>
                  <td>base</td>
                  <td colSpan={2}>7.08%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="footnote">
            async − sync at step 40: −0.4 pp (95% bootstrap CI over 60 problems: −2.1 to +1.2). Trained −
            base at step 40: +2.1 pp (−0.2 to +4.5).
          </p>
          <div className="grid-2">
            <Figure
              src={CHART.reward}
              alt="Reward curves versus step and wall-clock"
              caption="Figure 4. Reward vs step and vs wall-clock."
            />
            <Figure
              src={CHART.eval}
              alt="Eval pass@1 for sync and async"
              caption="Figure 5. Eval pass@1 checkpoints."
            />
          </div>

          <h3>Staleness and the importance correction</h3>
          <p>
            Generation is the bottleneck, so the learner is usually one version ahead. Behavior→current KL
            was the same in sync and async (~3.4–3.7×10⁻⁴): the gap is mostly vLLM fp8 KV vs bf16 trainer
            numerics, not policy lag. Truncated IS is needed in both modes.
          </p>
          <Figure
            src={CHART.staleness}
            alt="Staleness histogram"
            caption="Figure 6. Staleness histogram under k=2."
          />
        </section>

        <section id="related">
          <p className="eyebrow">Context</p>
          <h2>How this lines up with Miles / PyTorch Conf</h2>
          <p>
            PyTorch Conference 2026 put async LLM RL front and center: keep rollout generating on slightly
            stale weights while the trainer drains a buffer, then push versioned weights back to the
            inference fleet. This study is a small, instrumented A/B of that idea on TPU — not a new
            algorithm paper.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Theme</th>
                  <th>Miles / Conf systems work</th>
                  <th>This study</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Staleness</td>
                  <td>
                    Allow off-policyness so gen and train overlap; TRL AsyncGRPO uses{" "}
                    <span className="mono">max_staleness</span> and can drop older samples [
                    <a href="#ref-miles">1</a>, <a href="#ref-trl">4</a>]
                  </td>
                  <td>
                    Hard cap <strong>k=2</strong>; mean staleness 1.09; keep samples and correct with
                    truncated IS
                  </td>
                </tr>
                <tr>
                  <td>Off-policy correction</td>
                  <td>
                    Behavior log-probs / surrogate losses across the rollout–train boundary [
                    <a href="#ref-trl">4</a>, <a href="#ref-forge">3</a>]
                  </td>
                  <td>
                    Learner recomputes log-probs under current weights;{" "}
                    <span className="mono">w ≤ 2</span> truncated IS
                  </td>
                </tr>
                <tr>
                  <td>Weight sync</td>
                  <td>
                    NCCL/RDMA and TorchStore versioned state_dicts for multi-replica fleets [
                    <a href="#ref-miles">1</a>, <a href="#ref-torchstore">2</a>,{" "}
                    <a href="#ref-forge">3</a>]
                  </td>
                  <td>
                    Colocated safetensors on <span className="mono">/dev/shm</span> + in-place vLLM reload
                    (~1.8 s)
                  </td>
                </tr>
                <tr>
                  <td>Claim</td>
                  <td>
                    Async removes the gen↔train bubble at frontier GPU/MoE scale [
                    <a href="#ref-miles">1</a>]
                  </td>
                  <td>
                    Measured <strong>1.61×</strong> wall-clock and rollout idle ≈0 on one v6e-4
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="footnote">
            Closest cousins: Miles (systems thesis + versioned weights) and Hugging Face AsyncGRPO
            (staleness bound + behavior log-probs). TorchStore / torchforge describe the weight-store
            abstraction we intentionally simplified away for a single-host TPU pair.
          </p>
        </section>

        <section id="caveats">
          <p className="eyebrow">Limits</p>
          <h2>Caveats & cost</h2>
          <ul>
            <li>
              <strong>Short / weak signal.</strong> 40 steps; only ~3.5 of 16 groups per batch carried
              gradient; ~88% of samples hit the 3,072-token cap in non-thinking mode.
            </li>
            <li>
              <strong>Unbalanced chips.</strong> 1 rollout + 1 learner leaves ~36% learner idle even in
              async. A 3:1 split would likely raise the speedup further.
            </li>
            <li>
              <strong>Learner MFU is low</strong> (~3% eager). <span className="mono">torch.compile</span>{" "}
              failed on Qwen3.5 Gated DeltaNet view-stride errors.
            </li>
            <li>
              <strong>Zone.</strong> Preferred Spot/Flex zones were exhausted; all numbers are from
              asia-northeast1-b Flex-start.
            </li>
          </ul>
          <p>
            <strong>Cost:</strong> ≈ $22.1 for 4.09 h at $5.40/h Flex-start (including setup). Sync ≈ $3.9
            and async ≈ $2.5 per 40-step run on 2 chips. Compile-cache bucket (~3.8 GB) kept on purpose.
          </p>
        </section>

        <section id="refs">
          <p className="eyebrow">Bibliography</p>
          <h2>References</h2>
          <ol className="refs">
            <li id="ref-miles">
              <cite>Yuan, Yueming.</cite> “Miles: RL post-training for the new era of scale and
              workloads.” <em>PyTorch Conference 2026</em> (talk). Also: RadixArk / PyTorch Blog, “Miles:
              A PyTorch-Native Stack for Large-Scale LLM RL Post-Training,” 30 Jun 2026.{" "}
              <a href="https://cdn.sessionize.com/download/idgayrey~KCRhB3suN75AnPeiMM36R3.pdf~miles_pytorchconf_2026.pdf">
                Talk slides (PDF)
              </a>
              {" · "}
              <a href="https://pytorch.org/blog/miles-a-pytorch-native-stack-for-large-scale-llm-rl-post-training/">
                Blog post
              </a>
              .
            </li>
            <li id="ref-torchstore">
              <cite>Pasqualin, Lucas; Pintz, Danielle; Wang, Allen; Afzali, Amir.</cite> “TorchStore: What
              We Learned Building Distributed Storage Solutions for AsyncRL.” <em>PyTorch Conference
              Europe 2026</em>, 7 Apr 2026, Paris.{" "}
              <a href="https://pytorchconferenceeu2026.sched.com/event/2HioY/torchstore-what-we-learned-building-distributed-storage-solutions-for-aysncrl-lucas-pasqualin-danielle-pintz-allen-wang-amir-afzail-meta">
                Session page
              </a>
              {" · "}
              <a href="https://github.com/meta-pytorch/torchstore">meta-pytorch/torchstore</a>.
            </li>
            <li id="ref-forge">
              <cite>PyTorch Team.</cite> “Introducing torchforge – a PyTorch native library for scalable
              RL post-training and agentic development.” PyTorch Blog, 23 Oct 2025.{" "}
              <a href="https://pytorch.org/blog/introducing-torchforge/">Blog post</a>.
            </li>
            <li id="ref-trl">
              <cite>Hugging Face TRL.</cite> <span className="mono">AsyncGRPOTrainer</span> /
              asynchronous GRPO (experimental): background vLLM rollouts,{" "}
              <span className="mono">max_staleness</span>, NCCL weight sync. See also agentic RL sessions
              at <em>PyTorch Conference North America 2026</em>.{" "}
              <a href="https://github.com/huggingface/trl">huggingface/trl</a>
              {" · "}
              <a href="https://pytorch.org/blog/agentic-ai-and-next-gen-intelligence-sessions-at-pytorch-conference-north-america-2026/">
                NA 2026 session roundup
              </a>
              .
            </li>
          </ol>
        </section>

        <footer className="footer">
          <p>
            Engineering study for TPU Builders — not a peer-reviewed paper. Numbers from runs on branch{" "}
            <span className="mono">cursor/qwen38-async-vs-sync-rl-bc4a</span>. A longer follow-up run is
            underway to tighten the quality claims.
          </p>
        </footer>
      </main>
    </>
  )
}
