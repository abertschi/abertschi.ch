---
title: "Battling the Prefetcher: A side-channel Attack (part 2)"
date: "2022-09-11"
slug: "prefetching-side-channel"
draft: false
toc: true
tags: [
    "programming", "security"
]
---
This is the second post on the topic of prefetchers. In the [first post](), we
established the presence of several hardware prefetchers on a _Coffee Lake_ CPU
and verified some of their behaviors in the level 2 cache. We will use these
insights here to build a cache side-channel attack on a much smaller probing
buffer than typically used. <!--more-->
---

## Introduction
As we have established in the [first post](), there are 4 (documented) hardware
prefetchers available on an Intel Coffee Lake CPU.

- L2 Hardware Prefetcher (Stream Prefetcher)
- L2 Adjacent Cache Line Prefetcher (128 bytes boundary Prefetcher)
- L1 Data Cache Unit (DCU) Hardware Prefetcher (Stream Prefetcher)
- L1 Data Cache Unit (DCU) IP Prefetcher (Stride Prefetcher)

We did not manage to establish reliable results for the L1 data cache
prefetchers which is why we will use the L2 prefetchers for this attack. _This should work{{< super "TM" >}}_ because we can distingish if something is cached in L1 or L2 based
on the access time. However, the reliability of the attack may suffer.

The aim of this post is to experiment with a prime/probe/flush/reload attack
using a minimal probing buffer size, e.g. 256 x 64 bytes, and a custom access
pattern such that prefetchers do not cause unwanted cache hits and screw up the
attack.
   
## Background
We already know that prefetchers will not mess with unwanted cache hits across
page boundaries. On one hand, the less contiguous memory we need for an attack,
the less work is required to obtained said memory. Without the support of [huge
pages](https://www.kernel.org/doc/Documentation/admin-guide/mm/hugetlbpage.rst), it is in often much more difficult to obtain contiguous chunks of memory.
However, on the flip side is that prefetchers will start to introduce unwanted
cache hits if we use too little memory to probe accesses.


### Flush and Reload
The attack which we will simulate is a flush and reload attack. In a
<cite>_flush+reload_[^flushreload]</cite> scenario, an attack does not control a
victim's execution, and the victim and attacker share some target code or data.
This may be shared object files between distrusting user processes, or
deduplicated memory shared between two distrusting virtual machines.
Furthermore, the attacker can issue flush instructions to selectively evict
memory locations from the cache. On x86, the clflush instruction is
unpriviledged. If no clflush is available, an attack may use an eviction
strategy (<cite>see _this interesting read_[^evict]</cite>).

1. In the first phase of the attack, the attacker flushes all cache lines of
   the shared memory from the cache.
2. Then, the attacker waits until the victim accesses the shared memory.
3. In the 3rd phase, the attacker reloads the shared memory by measuring the
   access times of all cache lines. If he receives a cache hit, then the memory
   line was accessed by the victim in step 2.
   
Powerful attacks such as _Meltdown_ and _Spectre_ are built based on this idea. As an excursion and to motivate flush+reload further, consider this snippet:
```
# char probing_array[4096 * 256];
mov eax, [kernel-address]              // Segmentation fault
mov ebx, [probing_array + 4096 * eax]  // microarchitural traces in cache
```

Unpriviledged code loads `kernel-address` into `eax`, and dereferences it such
that distinct values of `eax` end up in different pages. Due to out-of-order
execution, the access into `probing_array` ends up in the cache. The pipeline is
flushed due to the illegal access of priviledged memory. However, the
microarchitectural changes remain in the cache. With a signal handler, we can
recover from the segfault and probe the cache to leak a kernel byte. This is the
gist of the <cite>_Meltdown_[^meltdown] attack</cite>.

[^evict]: Oren, Yossef and Kemerlis, Vasileios P. and Sethumadhavan, Simha and Keromytis, Angelos D., 2015, [The Spy in the Sandbox -- Practical Cache Attacks in Javascript](https://arxiv.org/abs/1502.07373)


[^flushreload]: Yuval Yarom and Katrina Falkner, 2014, [FLUSH+RELOAD: A High Resolution, Low Noise, L3 Cache Side-Channel Attack](https://www.usenix.org/node/184416), 23rd USENIX Security Symposium (USENIX Security 14)

[^meltdown]: Moritz Lipp and Michael Schwarz and Daniel Gruss and Thomas Prescher and Werner Haas and Anders Fogh and Jann Horn and Stefan Mangard and Paul Kocher and Daniel Genkin and Yuval Yarom and Mike Hamburg, 2018, [Meltdown: Reading Kernel Memory from User Space](https://www.usenix.org/conference/usenixsecurity18/presentation/lipp), 27th USENIX Security Symposium (USENIX Security 18).   


## Threat Model
In the scope of this post, we assume that victim and attacker are in the
**same** unpriviledged process. We will simulate some memory access by the
victim, and then use a probing buffer of only 4 pages to probe the victim's
memory access for a cache hit. The attacker uses clflush and the processes is
pinned to a core with taskset. This experiment is done in a way that (hopefully
:-)) confuses the prefetcher not to hit the cache.

## Experiments

## Conclusion

## Credits
