---
title: "Exploring the Prefetching Behavior of an Intel Coffee Lake CPU"
date: "2020-09-01"
slug: "prefetching"
description: ""
draft: false
toc: true
tags: [
    "programming", "security"
]
---

In this post I will summarize some of the insights I have gotten while looking
at the prefetching behavior of an _Intel Coffee Lake CPU_. Prefetching plays an
important role in system performance and their study is important for efficient
cache side channel attacks. However, Intel's prefetchers remain poorly
documented and their inner-workings mostly obfuscated for the public. While the
results discussed in this post are imprecise and just a mere drop in the ocean,
I hope they are nonetheless useful for someone interested in the matter.
<!--more-->
---


<!-- Most of behavorthe prefetching behavior of Intel CPUs is still undocumented and obfuscated. -->
<!-- Prefetchers play an important role on system performance and their study can be -->
<!-- used for more efficient side channel attacks. While the obtain results are -->
<!-- imprecise and a mere drop in the ocean, I hope they are nonetheless useful for -->
<!-- someone interested in the matter. -->

<!-- ## Background -->

## Introduction
Side channel attacks such as <cite> Prime+Probe[^1]</cite> or
<cite>Flush+Reload[^2]</cite> have become a powerful threat to many systems. In
such a side channel, an attacker monitors differences in hit- and miss times of
the CPU cache to infer access behaviors of a potential victim. Common system
workloads are often memory-latency bound which is why cache misses play an
important role in system performance. In order to reduce cache misses, modern
CPUs feature hardware prefetchers to reduce DRAM accesses and to hide the
latency induced by a cache miss. A prefetcher is a piece of hardware in the CPU
which watches DRAM memory access patterns and tries to predict the next pieces
of memory needed. It then _pre-fetches_ these predictions into the cache.
Despite their importance, Intel manuals only reveal little information about the
<cite>inner workings[^3] [^4]</cite> of prefetchers. A better understanding of
hardware prefetchers contributes to more efficient cache side channel attacks as
hardware prefetchers introduce unwanted cache hits.

In this post I will document some findings on the prefetching behavior of an
Intel Coffee Lake 8th generation CPU (launched in 2017), in particular the
following model:

```
$ lscpu
Architecture:        x86_64
CPU op-mode(s):      32-bit, 64-bit
CPU(s):              12
On-line CPU(s) list: 0-11
Thread(s) per core:  2
Core(s) per socket:  6
Socket(s):           1
CPU family:          6
Model:               158
Model name:          Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz
L1d cache:           32K
L1i cache:           32K
L2 cache:            256K
L3 cache:            12288K
...
```
As we can see, the CPU discussed has 6 cores (12 logical). It has a data- and instruction L1 cache of 6 x 32KB (8-way), a L2 cache of 6 x 256KB (4-way) and a L3 cache of 12MB (16-way).


[^1]: Dag Arne Osvik and Adi Shamir and Eran Tromer, 2005, [Cache attacks and
      Countermeasures: the Case of AES](https://eprint.iacr.org/2005/271),
      Cryptology ePrint Archive, Paper 2005/271
    

[^2]: Yuval Yarom and Katrina E. Falkner, 2014, [FLUSH+RELOAD: A High
    Resolution, Low Noise, L3 Cache Side-Channel
    Attack](https://www.usenix.org/node/184416.), 23rd USENIX Security Symposium
    (USENIX Security 14)

[^3]: Intel. 2016, [Intel 64 and IA-32 Architectures Optimization Reference
    Manual](https://web.archive.org/save/https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-optimization-manual.pdf)


[^4]: Intel, 2019, [Intel 64 and IA-32 Architectures Software Developer’s
    Manual, Model Specific Registers](https://web.archive.org/save/https://www.intel.com/content/dam/develop/external/us/en/documents/335592-sdm-vol-4.pdf).

## Hardware Prefetchers
If we skim through Intel manuals, we find the presence of four hardware prefetchers <cite>[^3]
[^4]</cite>. They can be controlled core-individually using the _Model Specific
Register (MSR)_ at address `0x1A4` using bits 0 to 3 (see Table 2-20, MSR MISC
FEATURE CONTROL in <cite>_Intel 64 and IA-32 Architectures Software Developer’s
Manual_ [^4]</cite>).

I summarize the bits below:

- Bit 0: L2 Hardware Prefetcher
- Bit 1: L2 Adjacent Cache Line Prefetcher
- Bit 2: L1 Data Cache Unit (DCU) Hardware Prefetcher
- Bit 3: L1 Data Cache Unit (DCU) IP Prefetcher

We can set the MSR register using
[msr-tools](https://github.com/intel/msr-tools) developed by Intel (now
discontinued), a fasade onto Linux's MSR abstraction `/dev/cpu/<coreid>/msr`. For instance, the command below disables all four prefetchers on
all cores.

```
sudo wrmsr -a 0x1a4 0xf
```

### Intel Manuals on Prefetching
There is only sparse official information available on data prefetching. Sparse
enough to briefly quote the information here. The subsequent text is shortened
from <cite>Chapter 2.3.5.4 in _Intel 64 and IA-32 Architectures Optimization
Reference Manual_ [^3]</cite>. I marked some interesting bits in bold.

> #### L2 Hardware Prefetcher (Streamer):  
> This prefetcher monitors read requests from the L1 cache for ascending and descending sequences of addresses. Monitored read requests include L1 DCache requests initiated by load and store operations and by the hardware prefetchers, and L1 ICache requests for code fetch. When a forward or backward stream of requests is detected, the anticipated cache lines are prefetched. **Prefetched cache lines must be in the same 4K page**.
>
> The streamer and spatial prefetcher prefetch the data to the last level cache. Typically data is brought also to the L2 unless the L2 cache is heavily loaded with missing demand requests. Enhancement to the streamer includes the following features:
>
> - The streamer may issue two prefetch requests on every L2 lookup. **The streamer can run up to 20 lines ahead of the load request**.
> - Adjusts dynamically to the number of outstanding requests per core. If there are not many outstanding requests, the streamer prefetches further ahead. If there are many outstanding requests it prefetches to the LLC only and less far ahead.
> - When cache lines are far ahead, it prefetches to the last level cache only and not to the L2. This method avoids replacement of useful cache lines in the L2 cache.
> - **Detects and maintains up to 32 streams of data accesses.** For each 4K byte page, you can maintain one forward and one backward stream can be maintained.
>
>
> #### L2 Adjacent Cache Line Prefetcher: 
> This prefetcher strives to complete every cache line **fetched to the L2 cache with the pair line that completes it to a 128-byte aligned chunk.**
>
> #### L1 Data Cache Unit (DCU) Hardware Prefetcher:
> This prefetcher, also known as the streaming prefetcher, is triggered by an ascending access to very recently loaded data. The processor assumes that this access is part of a streaming algorithm and automatically fetches the next line.
>
> #### L1 Data Cache Unit (DCU) IP Prefetcher:
> This prefetcher keeps track of individual load instructions. If a load instruction is detected to have a regular stride, then a prefetch is sent to the next address which is the sum of the current address and the stride. This prefetcher can prefetch forward or backward and can detect strides of up to 2K bytes.
>


## Experiments
In this section we will run some experiments to verify some of the behavior we
got from Intel's manual. The experiments execute on the aforementioned CPU.

It turns out that modifications on the MSR registers will flush the cache so we
cannot prime the cache and then disable the prefetchers during the probing phase
of the experiment. Also, remember that the granularity of a cache-line is 64
bytes on Intel CPUs.

The experiments follow a _Prime and Probe_ protocol:

1. We allocate a probing array of contiguous memory using _mmap_, it has the size
  of a multiple of a page size, e.g. 3 x 4KB. This is our _probing array_.
2. We then flush the entire _probing array_ to ensure that no cache-line is the
   cache using _clflush_.
3. We then access some memory. This is the _Prime Phase_.
4. We probe a single cache line in the _probing array_. Based on the access
   time, decide if it was in a cache or not. This is the _Probe Phase_.
5. We now repeat steps 2. to 4. until all cache lines are probed. This is
   motivated to ensure that probing does not confuse the prefetchers.

If we access memory in a loop, we further have to ensure that speculative
execution will not induce unwanted memory accesses. We solve this by putting a
memory fence at the beginning of the loop body, i.e. with the intrinsic `_mm_mfence`.

<!-- ### L2 Hardware Prefetcher -->

### L2 Streamer: Prefetched cache lines must be in the same 4K page
In this experiment, we try to reproduce the L2 Streamer prefetch behavior across a 4K page. We therefore disable all prefetchers except Streamer.

> [Streamer] When a forward or backward stream of requests is detected, the anticipated cache lines are prefetched. Prefetched cache lines must be in the same 4K page. 

 We access a number of cache lines in sequence (green) and probe the array for hits introduced by the prefetcher (red). Cache misses are marked in gray.

We can clearly see that no prefetching occurs across a 4KB page boundary, despite the access of cache-lines 50 to 63. Interestingly, the first two cache-lines of every page in the probing array are always prefetched.

[![l2stream_pageboundary1](/blog/2022-09-prefetching/page_boundary_50_a.png)](/blog/2022-09-prefetching/page_boundary_50_a.png)
{{<caption >}} Probe cache-lines 50 to 54 (green), prefetching of cache-line until 60 (red). {{< /caption >}}

[![l2stream_pageboundary2](/blog/2022-09-prefetching/page_boundary_50_60.png)](/blog/2022-09-prefetching/page_boundary_50_60.png)
{{<caption >}} Probe cache-lines 50 to 59 (green), prefetching of cache-line until 65 (red) (prefetched until 63, and page-boundary always prefetched (64, 65 as well as 0, 1)) {{< /caption >}}

[![l2stream_pageboundary3](/blog/2022-09-prefetching/page_boundary_50_63.png)](/blog/2022-09-prefetching/page_boundary_50_63.png)
{{<caption >}} Probe cache-lines 50 to 63. No prefetching across page boundary. {{< /caption >}}

What happened is that we initiated a new stream, determined its direction and confirmed the access
pattern so that L2 Streamer started to prefetch multiple +1 cache-lines ahead. The prefetching stops at the page boundary. This is in accordance to the manual. 

However, it remains unclear why we receive a cache hit in the first two
cache-lines of every page.


### L2 Adjacent: Prefetch on a 128 bytes boundary
The adjacent L2 cache-line prefetcher prefetches one additional cache-line such
that two cache-lines on a 128 bytes boundary are always in the cache.

> [L2 Adjacent] This prefetcher strives to complete every cache line fetched to the L2 cache with the pair line that completes it to a 128-byte aligned chunk.

 In other words, if we access cache-line 42, the prefetcher will fetch
 cache-line 43, and if we access cache-line 37, the 128 byte boundary includes
 cache-line 36. This is demonstrated with the following two experiments and
 seems to work in accordance to the bits we found in the manual.

[![l2adj1](/blog/2022-09-prefetching/adjacent_1.png)](/blog/2022-09-prefetching/adjacent_1.png)
{{<caption >}} {{< /caption >}}

[![l2adj2](/blog/2022-09-prefetching/adjacent_2.png)](/blog/2022-09-prefetching/adjacent_2.png)
{{<caption >}} Prefetch behavior of L2 Adjacent Prefetcher. Behavior is ahead (next cache-line) as well as previous cache line, depending on the 128 bytes alignment of the cache line accessed.{{< /caption >}}


### L2 Streamer: Access up to 20 lines ahead of the load request.

> [L2 Streamer] The streamer may issue two prefetch requests on every L2 lookup. The streamer can run up to 20 lines ahead of the load request.
> 
> Adjusts dynamically to the number of outstanding requests per core. If there are not many outstanding requests, the streamer prefetches further ahead. If there are many outstanding requests it prefetches to the LLC only and less far ahead.

## Literature
Some good corner stones for further reading and experiments include the following literature;

Rohan et al. studied the stream direction, trigger, and prefetch degree of L2
Hardware Prefetcher (Streamer) in experiments running multiple threads on
the same physical core [5]. Wang et al. [6] study prefetching and replacement
policy on several CPUs and further design a prime and probe attack which
minimizes the impact of prefetching.

## Credits
2688
