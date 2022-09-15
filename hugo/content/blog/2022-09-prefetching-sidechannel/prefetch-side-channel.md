---
title: "Battling the Prefetcher: A side-channel Attack (Part 2)"
date: "2022-09-11"
slug: "prefetching-side-channel"
draft: false
toc: true
tags: [
    "programming", "security"
]
---
This is the second post on the topic of prefetchers. In the [first
post](/blog/2022/prefetching/), we established the presence of several hardware
prefetchers on a _Coffee Lake_ CPU and verified some of their behaviors in the
level 2 cache. We will use these insights here and try to build a cache
side-channel attack on a much smaller probing buffer than typically used.
<!--more-->
---

{{< toc >}}

## Introduction
As we have established in the [first post](), there are 4 (documented) hardware
prefetchers available on an Intel Coffee Lake CPU.

- L2 Hardware Prefetcher (Stream Prefetcher)
- L2 Adjacent Cache Line Prefetcher (128 bytes boundary Prefetcher)
- L1 Data Cache Unit (DCU) Hardware Prefetcher (Stream Prefetcher)
- L1 Data Cache Unit (DCU) IP Prefetcher (Stride Prefetcher)

We did not manage to establish reliable results for the L1 data cache
prefetchers which is why we will focus on the L2 prefetchers in this post. _This
should work{{< super "TM" >}}_ because we can distinguish if something is cached
in L1 or L2 based on the access time. However, without reliable results on the
behavior of the L1 prefetchers, the attack may not easily generalize to all
prefetchers.


This post aims to tinker with a prime/probe/flush/reload attack
using a minimal probing buffer size, e.g. 256 x 64 bytes, and a custom access
pattern such that prefetchers do not cause unwanted cache hits and screw up the
attack.

The post is structured around three attacks:
- Leaking 5 bits with L2 Prefetchers,
- Leaking 5 bits with All Prefetchers,
- Leaking 8 bits with L2 Prefetchers.


## Background
We already know that prefetchers do not mess with unwanted cache hits across
page boundaries. On one hand, the less contiguous memory we need for an attack,
the less work is required to obtain said memory. In an attack scenario, it is
not always easy to obtain contiguous chunks of memory. However, on the flip
side, the prefetchers will start to introduce unwanted cache hits if we use too
little memory to probe accesses.

<!-- Without the support of [huge -->
<!-- pages](https://www.kernel.org/doc/Documentation/admin-guide/mm/hugetlbpage.rst), -->
<!-- it is in often much more difficult to obtain contiguous chunks of memory. -->

### Flush and Reload
The attack which we will simulate is a flush and reload attack. In a
<cite>_flush+reload_[^flushreload]</cite> scenario, an attacker does not control
a victim's execution, and the victim and attacker share some target code or
data. This may be shared object files between distrusting user processes or
deduplicated memory shared between two distrusting virtual machines.
Furthermore, the attacker can issue flush instructions to selectively evict
memory locations from the cache. On x86, the clflush instruction is
unprivileged. If no clflush is available, an attack may use an eviction strategy
(<cite>see _this interesting read_[^evict]</cite>).

1. During the first phase of the attack, the attacker flushes all cache lines of
   the shared memory from the cache.
2. The attacker then waits until the victim accesses the shared memory.
3. In the final phase, the attacker reloads the shared memory by measuring the
   access times of all cache lines. If he receives a cache hit, then the memory
   line was accessed by the victim in step 2.
   
Powerful attacks such as _Meltdown_ and _Spectre_ are derived from this idea. As
an excursion and to motivate flush+reload further, consider this snippet:

```
# char probing_array[4096 * 256];
mov eax, [kernel-address]              // Segmentation fault
mov ebx, [probing_array + 4096 * eax]  // Microarchitectural traces in cache
```

Unprivileged code loads `kernel-address` into `eax` and dereferences it such
that distinct values of `eax` end up on different pages. Due to out-of-order
execution, the access into `probing_array` ends up in the cache. The pipeline is
flushed due to the illegal access of privileged memory. However, the
microarchitectural changes remain in the cache. With a signal handler, we can
recover from the segfault and probe the cache for a kernel byte leak. This is
the gist of the <cite>_Meltdown_[^meltdown] attack</cite>.

[^evict]: Oren, Yossef and Kemerlis, Vasileios P. and Sethumadhavan, Simha and
    Keromytis, Angelos D., 2015, [The Spy in the Sandbox -- Practical Cache
    Attacks in Javascript](https://arxiv.org/abs/1502.07373)


[^flushreload]: Yuval Yarom and Katrina Falkner, 2014, [FLUSH+RELOAD: A High
    Resolution, Low Noise, L3 Cache Side-Channel
    Attack](https://www.usenix.org/node/184416), 23rd USENIX Security Symposium
    (USENIX Security 14)

[^meltdown]: Moritz Lipp and Michael Schwarz and Daniel Gruss and Thomas
    Prescher and Werner Haas and Anders Fogh and Jann Horn and Stefan Mangard
    and Paul Kocher and Daniel Genkin and Yuval Yarom and Mike Hamburg, 2018,
    [Meltdown: Reading Kernel Memory from User
    Space](https://www.usenix.org/conference/usenixsecurity18/presentation/lipp),
    27th USENIX Security Symposium (USENIX Security 18).

## Threat Model
In the scope of this post, we assume that the victim and attacker are in the
**same** unprivileged process. We will simulate some memory access (into a
shared buffer of 4 pages) by the victim, and then use the said probing buffer to
probe the victim's memory access for a cache hit. The attacker uses clflush and
the process is pinned to a core with taskset. We further allow the attacker to
repeat the experiment as often as we want to increase accuracy. Also, we allow
the attacker to disable the L1 prefetchers if this helps to increase accuracy.
The attacker's probing is done in a way that (hopefully :-)) to confuse the
prefetcher so it does not to hit the cache and introduce false positives.

## Experiments
The experiments run on an Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz, pinned on a
single core with taskset. Remember from [Part
1](blog/2022/prefetching-side-channel/) that we primarily got reliable insights
for the L2 cache prefetchers. Hence, the experiments below distinguish a setup
that enables L2 prefetchers from all prefetchers.

<!-- With no reliable results for L1 -->
<!-- prefetchers, we cannot use many insights from blog post Part 1. -->

### Methodology
As we already established in the Threat Model, we have a shared `probing_buffer`
of 4 pages. With a stride size of a cache line (64 bytes), this allows us in
theory to leak `4 * 4096 / 64 = 256` distinct values at a time, or 8 bits.

```
// pseudo c code:

probing_buffer = mmap(NULL, 4 * 4096,
                      PROT_READ | PROT_WRITE,
                      MAP_PRIVATE | MAP_ANONYMOUS | MAP_HUGETLB | MAP_POPULATE,
                      -1, 0);
                      
clflush(all bytes in probing_buffer);

// victim:
int secret = 100;
*(volatile char*) probing_buffer + secret * 64;

// attacker:
/* battle prefetcher and probe probing_buffer to leak secret. */
```
The side-channel is the probing buffer (or the underlying cache that caches
access into the probing buffer). The victim accesses a secret element in the
buffer and the attacker tries to recover the secret with an access order that
confuses the prefetchers. The more the prefetchers are confused, the less likely
they introduce unwanted cache hits.

### Leaking 5 bits with L2 Prefetchers
In the first experiment, we will focus on a single page. A page has 4096 bytes,
 which holds 64 cache lines. So the total number of bits we could leak at once
 is 6 bits, log2(64) = 6.

**Insight.** We need some cache lines to initially confuse the prefetcher so we
only end up with 5 bits. The following experiment requires 44 cache lines, 32
lines to leak 5 bits, and 12 (or more) lines to trick the L2 stream prefetcher.
The experiment follows a confusing and leaking phase.

**Confusing Phase.** We know that the stream prefetcher associates an access
stream with a memory page. We confuse the stream by first accessing 12 cache
lines in a backward fashion, e.g. cache lines 11, 10, 9, ... 0. Subsequent
memory accesses in a forward fashion (against the stream direction) will
(hopefully) no longer pollute the cache with prefetches.

**Leaking Phase.** We probe the cache lines 12 to 31 for cache hits. Here we
only probe every even cache line (e.g. cache lines 12, 14, 16, ...). This
accounts for the 128 bytes L2 prefetcher. If we receive a cache hit in L1, we
know that the victim accessed the current cache line. If we receive an L2 hit,
we know that the victim accessed the next (+1) cache line. This takes advantage
of the fact that the 128 bytes boundary prefetcher prefetches into level 2
cache. If we only allow L2 prefetchers we could also probe all elements in a
sequence and only look for L1 accesses. However, the fewer memory probes, the
fewer potential prefetches.

**Threshold Tuning.** We establish a threshold for an L1 and L2 cache hit in a
tuning phase. On my hardware, I established an L1 hit threshold of 110 cycles (or
fewer) and an L2 threshold of 150 cycles.


**Experiments.** The following plots depict the leaking phase for secrets 0, 24,
30 (L1 hits), and 1, 25, 31 (L2 hits). The L1 prefetchers are disabled. We can
see that the secrets can be recovered.

Secrets 0, 1 (success):
[![attack](/blog/2022-09-prefetching-sidechannel/week8-data-m-0.csv.svg)](/blog/2022-09-prefetching-sidechannel/week8-data-m-0.csv.svg)
{{<caption >}} The victim accesses cache line 0 (secret). We receive an L1 hit
in cache line 0. {{< /caption >}}


[![attack](/blog/2022-09-prefetching-sidechannel/week8-data-m-1.csv.svg)](/blog/2022-09-prefetching-sidechannel/week8-data-m-1.csv.svg)
{{<caption >}}The victim accesses cache line 1 (secret). We receive an L2 hit in
cache line 0. {{< /caption >}}

Secrets 24, 25 (success):
[![attack](/blog/2022-09-prefetching-sidechannel/week8-data-m-24.csv.svg)](/blog/2022-09-prefetching-sidechannel/week8-data-m-25.csv.svg)
{{<caption >}}The victim accesses cache line 24 (secret). We receive an L1 hit
in cache line 24. Note that there is noise in cache line 22. However, the attack
still succeeds.{{< /caption >}}


[![attack](/blog/2022-09-prefetching-sidechannel/week8-data-m-25.csv.svg)](/blog/2022-09-prefetching-sidechannel/week8-data-m-25.csv.svg)
{{<caption >}} The victim accesses cache line 25 (secret). We receive an L2 hit
in cache line 24. {{< /caption >}}

Secret 30, 31 (success):
[![attack](/blog/2022-09-prefetching-sidechannel/week8-data-m-30.csv.svg)](/blog/2022-09-prefetching-sidechannel/week8-data-m-30.csv.svg)
{{<caption >}} The victim accesses cache line 30 (secret). We receive an L1 hit
in cache line 30. There is noise in cache line 28. However, the attack still
succeeds.{{< /caption >}}

[![attack](/blog/2022-09-prefetching-sidechannel/week8-data-m-31.csv.svg)](/blog/2022-09-prefetching-sidechannel/week8-data-m-31.csv.svg)
{{<caption >}} The victim accesses cache line 31 (secret). We receive an L2 hit
in cache line 30. {{< /caption >}}

Given this strategy, we manage to recover all secrets. However, this approach
only allows the leak of 5 bits. There is some noise in the measurements.
Nevertheless, we can filter it out given we can accurately determine the L1 hit.
The following experiment will now use the same strategy but will enable all
available prefetchers.

### Leaking 5 bits with All Prefetchers

**Experiments.** All 4 prefetchers active and the same strategy as before seem
to break the attack. The experiment does not easily scale to all prefetchers.
This was apprehended because we mark an L1 hit as a successful leak.
Interestingly, we now often receive an L1 hit in cache line 30. The plots below
depict unsuccessful secret recoveries.

Secrets 0, 1 (fail):
[![attack](/blog/2022-09-prefetching-sidechannel/week8-data-m-all-0.csv.svg)](/blog/2022-09-prefetching-sidechannel/week8-data-m-all-0.csv.svg)
{{<caption >}} The victim accesses secret 0, we receive an L1 hit in cache line
0 as well as cache line 30. The secret cannot be uniquely recovered.
{{</caption>}}

[![attack](/blog/2022-09-prefetching-sidechannel/week8-data-m-all-1.csv.svg)](/blog/2022-09-prefetching-sidechannel/week8-data-m-all-1.csv.svg)
{{<caption >}} The victim accesses secret 1, we receive an L2 hit in cache line
0 as well as a level 1 hit cache line 30. The secrets cannot be recovered.
{{</caption >}}

Secrets 24, 25 (fail):
[![attack](/blog/2022-09-prefetching-sidechannel/week8-data-m-all-24.csv.svg)](/blog/2022-09-prefetching-sidechannel/week8-data-m-all-24.csv.svg)
{{<caption >}} The victim accesses cache line 24, total noise. {{< /caption >}}

[![attack](/blog/2022-09-prefetching-sidechannel/week8-data-m-all-25.csv.svg)](/blog/2022-09-prefetching-sidechannel/week8-data-m-all-25.csv.svg)
{{<caption >}} Victim accesses cache line 25, total noise.  {{< /caption >}}

All prefetchers enabled seem to screw things up. No secret can be uniquely
recovered.

<!-- However, [every new beginning comes from some other beginning's end](https://youtu.be/xGytDsqkQY8?t=112). -->

### Leaking 8 bits with L2 Prefetchers
We now continue to leak 1 byte across 4 pages. For this attack, we again disable
the L1 prefetchers.

**Insight.** Unlike the previous experiment, we no longer use spare cache lines
to prime the prefetchers.

- Given we only consider L2 prefetchers, we mark a hit in L1 as the leak of the
  secret. However, this does not easily generalize to the L1 prefetcher.
- Remember from Post 1 that the Stream Prefetcher may prefetch up to 2 cache
  lines following a memory access. The prefetch window can move further ahead
  (up to circa 30 lines ahead) if we assess contiguous cache lines. To avoid
  this, we can probe lines with a stride size of 3 lines. If we aim to leak 8
  bits we have no spare lines so this insight is not useful.
- Accessing around 10 contiguous cache lines at the end of a page (lower to higher) seems to
  confuse the L2 Streamer if we then change the direction and probe backward
  (higher to lower in the page).

The idea in this experiment is to confuse the L2 prefetcher such that it creates
a stream table entry in the wrong direction. This is analogous to the previous
experiment. For each page, we first access upwards (forward in cache lines) and
then change direction to probe backward. Additionally, we first probe only even
elements, and in a second attempt only odd elements (after flushing the probing
array and re-running the victim). This is motivated to further decrease L2
noise. Even and odd probings are then merged into one result across all pages.

**Experiments.** The following plots depict 4 experiments, a leak of secret
values 30, 60, 127, and 252. Only level 2 prefetchers are enabled. Four plots
belong to one attack (one memory page per plot). Marked in the figures is the
order of the cache lines accessed, the thresholds for L1 and L2, as well as L1
hits (green), L2 hits (red), and cache misses (gray). We notice that the attack
succeeds for secrets 30, 60, and 127 and fails for the secret 252.

Secret 30 (success):  
[![attack](/blog/2022-09-prefetching-sidechannel/l2_evenodd_30_0.svg)](/blog/2022-09-prefetching-sidechannel/l2_evenodd_30_0.svg)
[![attack](/blog/2022-09-prefetching-sidechannel/l2_evenodd_30_1.svg)](/blog/2022-09-prefetching-sidechannel/l2_evenodd_30_1.svg)
[![attack](/blog/2022-09-prefetching-sidechannel/l2_evenodd_30_2.svg)](/blog/2022-09-prefetching-sidechannel/l2_evenodd_30_2.svg)
[![attack](/blog/2022-09-prefetching-sidechannel/l2_evenodd_30_3.svg)](/blog/2022-09-prefetching-sidechannel/l2_evenodd_30_3.svg)
{{<caption >}} The victim accesses secret cache line 30 in a probing array of 256
cache lines. The attacker manages to leak the byte. {{< /caption >}}

As we can see for secret value 30, the attacker manages to leak the byte
(green). We receive noise at the start and the end of each page (red), however,
by selecting an L1 cache hit we manage to leak the secret.

Secret 60 (success):
[![attack](/blog/2022-09-prefetching-sidechannel/l2_evenodd_60_0.svg)](/blog/2022-09-prefetching-sidechannel/l2_evenodd_60_0.svg)
[![attack](/blog/2022-09-prefetching-sidechannel/l2_evenodd_60_1.svg)](/blog/2022-09-prefetching-sidechannel/l2_evenodd_60_1.svg)
[![attack](/blog/2022-09-prefetching-sidechannel/l2_evenodd_60_2.svg)](/blog/2022-09-prefetching-sidechannel/l2_evenodd_60_2.svg)
[![attack](/blog/2022-09-prefetching-sidechannel/l2_evenodd_60_3.svg)](/blog/2022-09-prefetching-sidechannel/l2_evenodd_60_3.svg)
{{<caption >}}The victim accesses secret cache line 60. We manage to leak the
secret byte. More noise in the L2 cache. {{< /caption >}}

Similar situation for secret byte 60. The attacker manages to leak the byte.
However, there is much noise in the L2 cache. It seems that the prefetcher loses
its confusion as it starts to prefetch in the wrong direction (unideal direction
for attack).

Secret 127 (success):
[![attack](/blog/2022-09-prefetching-sidechannel/l2_evenodd_127_0.svg)](/blog/2022-09-prefetching-sidechannel/l2_evenodd_127_0.svg)
[![attack](/blog/2022-09-prefetching-sidechannel/l2_evenodd_127_1.svg)](/blog/2022-09-prefetching-sidechannel/l2_evenodd_127_1.svg)
[![attack](/blog/2022-09-prefetching-sidechannel/l2_evenodd_127_2.svg)](/blog/2022-09-prefetching-sidechannel/l2_evenodd_127_2.svg)
[![attack](/blog/2022-09-prefetching-sidechannel/l2_evenodd_127_3.svg)](/blog/2022-09-prefetching-sidechannel/l2_evenodd_127_3.svg)
{{<caption >}} The victim accesses secret cache line 127. We manage to leak the
secret byte. More noise in the L2 cache. {{< /caption >}}

Secret 127 shows similar results to secret 60. The prefetcher starts to lose its
confusion and starts to massively introduce unwanted cache hits. However, the
secret can still be recovered by selecting L1 hits.

Secret 252 (fail):
[![attack](/blog/2022-09-prefetching-sidechannel/l2_evenodd_252_0.svg)](/blog/2022-09-prefetching-sidechannel/l2_evenodd_252_0.svg)
[![attack](/blog/2022-09-prefetching-sidechannel/l2_evenodd_252_1.svg)](/blog/2022-09-prefetching-sidechannel/l2_evenodd_252_1.svg)
[![attack](/blog/2022-09-prefetching-sidechannel/l2_evenodd_252_2.svg)](/blog/2022-09-prefetching-sidechannel/l2_evenodd_252_2.svg)
[![attack](/blog/2022-09-prefetching-sidechannel/l2_evenodd_252_3.svg)](/blog/2022-09-prefetching-sidechannel/l2_evenodd_252_3.svg)
{{<caption >}}The victim accesses secret cache line 252. 
Too much noise. Attack fails.  {{< /caption >}}  

The attacker fails to recover secret value 252. The threshold for L1 is not
accurate enough to distinguish an L1 access from all the noise in the L2 cache.

This should emphasize how easy it is to pollute the cache. Even if we
only allow L2 prefetches, the secret cannot always be recovered.

## Conclusion
We discussed preliminary results for confusing the Coffee Lake prefetchers. In
particular, we presented experiments to

- Leak 5 bits with L2 Prefetchers,
- Leak 5 bits with All Prefetchers,
- Leak 8 bits with L2 Prefetchers.

As we can see, the experiments are not always successful and need more probing
and tuning. If we only allow L2 prefetchers we can leak a secret by looking for
L1 cache hits. However, for a more realistic scenario, we must consider all
prefetchers. In addition, the considered threat model isolates much noise by
allowing both the victim and attacker to run in the same process.

I hope this post highlights how easy it is to pollute the cache with
unwanted accesses. Cache side-channel attacks are a relatively new attack
surface and are the result of careful fine-tuning and massaging of the cache.
Meltdown-like attacks have shown how damaging and powerful these attacks can be.


While the shown results are preliminary and just a drop in the ocean, I hope
this blog post puts some light onto the fascinating world of prefetchers and how
noise-prone cache side-channel attacks can be. The study of prefetchers remains
an active topic of research and insights into their inner workings can increase
the effectiveness of either cache side-channel attacks and their mitigations.

Thanks for reading.  
-- bean

## Credits
I'd like to thank Michael Roth for helping me with the findings.

