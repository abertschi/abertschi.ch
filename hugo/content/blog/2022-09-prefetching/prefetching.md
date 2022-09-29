---
title: "Battling the Prefetcher: Exploring Coffee Lake (Part 1)"
date: "2022-09-05"
slug: "prefetching"
draft: false
toc: true
tags: [
    "programming", "security"
]
---

In this post, I will summarize some of the insights I have gotten while looking
at the prefetching behavior of an _Intel Coffee Lake_ CPU. Prefetching plays an
important role in system performance and their study is important for efficient
cache side-channel attacks. However, Intel's prefetchers remain poorly
documented and their inner-workings are mostly obfuscated. While some of the
results discussed in this post are incomplete and just a mere drop in the ocean,
I hope they are nonetheless useful for someone interested in the matter. See
also [Part 2](/blog/2022/prefetching-side-channel/).

<!--more-->
---


<!-- Most of behavorthe prefetching behavior of Intel CPUs is still undocumented and obfuscated. -->
<!-- Prefetchers play an important role on system performance and their study can be -->
<!-- used for more efficient side channel attacks. While the obtain results are -->
<!-- imprecise and a mere drop in the ocean, I hope they are nonetheless useful for -->
<!-- someone interested in the matter. -->

<!-- ## Background -->

{{< toc >}}

## Introduction
Side channel attacks such as <cite> Prime+Probe[^1]</cite> or
<cite>Flush+Reload[^2]</cite> have become a powerful threat to many systems. In
such a [side channel](https://en.wikipedia.org/wiki/Side-channel_attack), an
attacker monitors differences in hit- and miss times of the CPU cache to infer
the access behaviors of a potential victim. Common system workloads are often
memory-latency bound which is why cache misses play an important role in system
performance. To reduce cache misses, modern CPUs feature hardware prefetchers to
reduce DRAM accesses and to hide the latency induced by a cache miss. A
[prefetcher](https://en.wikipedia.org/wiki/Cache_prefetching) is a piece of
hardware in the CPU which watches DRAM memory access patterns and tries to
predict the next pieces of memory needed. It then _pre-fetches_ these
predictions into the cache. Despite their importance, Intel manuals only reveal
little information about the <cite>inner-workings[^3] [^4]</cite> of
prefetchers. A better understanding of hardware prefetchers contributes to more
efficient cache side-channel attacks as hardware prefetchers introduce unwanted
cache hits.

In this post I will document some findings on the prefetching behavior of an
Intel Coffee Lake 8th generation CPU (launched in 2017), in particular,  the
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
<!-- As we can see, the CPU discussed has 6 cores (12 logical). It has a data- and instruction L1 cache of 6 x 32KB (8-way), a L2 cache of 6 x 256KB (4-way) and a L3 cache of 12MB (16-way). -->

This post will revolve around the following questions:
1. Find out which prefetchers are available on my hardware,
2. If a prefetcher is active, how large is the prefetch size,
3. And which memory accesses do and do not trigger a prefetch. 

<!-- To study the above questions, we will investigate the prefetching behavior in -->
<!-- isolation. This is motivated not to include undesired cache hits by other prefetchers. -->

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
If we skim through Intel manuals, we find the presence of four hardware
prefetchers <cite>[^3] [^4]</cite>. They can be controlled core-individually
using the _Model Specific Register (MSR)_ at address `0x1A4` using bits 0 to 3
(see Table 2-20, MSR MISC FEATURE CONTROL in <cite>_Intel 64 and IA-32
Architectures Software Developer’s Manual_ [^4]</cite>).

I summarize the bits below:

- Bit 0: L2 Hardware Prefetcher (Stream Prefetcher)
- Bit 1: L2 Adjacent Cache Line Prefetcher (128 bytes boundary Prefetcher)
- Bit 2: L1 Data Cache Unit (DCU) Hardware Prefetcher (Stream Prefetcher)
- Bit 3: L1 Data Cache Unit (DCU) IP Prefetcher (Stride Prefetcher)

We can set the MSR register using
[msr-tools](https://github.com/intel/msr-tools) developed by Intel, a facade onto Linux's MSR abstraction `/dev/cpu/<coreid>/msr`.
For instance, the command below disables all four prefetchers on all cores.

```
sudo wrmsr -a 0x1a4 0xf
```
I will now briefly introduce a _stream_ and _stride prefetcher_. For more
detailed information on prefetchers, please refer to the lecture on [Prefetching
by Prof. Onur
Mutlu](https://safari.ethz.ch/architecture/fall2020/lib/exe/fetch.php?media=onur-comparch-fall2020-lecture18-prefetching-afterlecture.pdf).

### Stream Prefetcher
A stream prefetcher prefetches multiple +1 cache lines ahead. It typically
requires a warm-up phase to confirm an access pattern:

- A new stream starts at memory access A,
- the stream direction is determined on access A+1,
- and finally, the stream is confirmed at access A+2.

Upon confirmation of the stream, the hardware may issue a prefetch to A+3, A+4,
and so on.

[![stream](/blog/2022-09-prefetching/stream.svg#width70)](/blog/2022-09-prefetching/stream.svg)
{{<caption >}}  {{< /caption >}}

### Stride Prefetcher
A stride prefetcher is similar to a stream prefetcher but allows a variable
access stride. So, instead of prefetching several +1 cache lines ahead, a stride
prefetcher keeps the state of a stride size N.

[![stride](/blog/2022-09-prefetching/stride.svg#width70)](/blog/2022-09-prefetching/stride.svg)
{{<caption >}}  {{< /caption >}}


### Intel Manuals on Prefetching
There is only sparse official information available on data prefetching. Sparse
enough to briefly quote the information here. The subsequent text is shortened
from <cite>_Intel 64 and IA-32 Architectures Optimization Reference Manual_
[^3]</cite>. I marked some interesting bits in bold:

{{< details "Chapter 2.3.5.4, _Intel 64 and IA-32 Architectures Optimization Reference Manual_">}}


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
{{< /details >}}

## Experiments
In this section, we will run experiments to verify some of the behavior we
received from Intel manuals. The experiments are executed on the aforementioned
CPU and pinned to a single core using
[taskset](https://man7.org/linux/man-pages/man1/taskset.1.html).

The experiments follow a _Flush and Reload_ protocol:

1. We allocate a probing array of contiguous memory using _mmap_, it has the
size of a multiple of a page size, e.g. 3 x 4KB. This is our _probing array_.
2. We then flush the entire _probing array_ to ensure that no cache line is the
cache using _clflush_.
3. We then performed the desired sequence of memory access.
4. We probe a single cache line in the _probing array_. Based on the access
time, we decide if it was in a cache hit or not.
5. We now repeat steps _2. to 4._ until all cache lines are probed. This is
motivated to ensure that probing does not confuse the prefetchers.

If we access memory in a loop, we further have to ensure that speculative
execution will not induce unwanted memory accesses. We solve this by putting a
memory fence at the beginning of the loop body.

It turns out that modifications on the MSR registers will flush the cache so we
cannot prime the cache and then disable the prefetchers during the probing phase
of the experiment. Also, remember that the granularity of a cache line is 64
bytes on Intel CPUs.


{{< details "A code sample that illustrates the protocol.">}}
```c
/*
* Sample code snippet to illustrate the gist of the timing measurements.
* Here we measure prefetching impact when accessing TARGET,
* a single cache line.
*/
const int N = 1000;
const int M = 128;
const long CL = 64;
const int TARGET = 37;

char* probe_array = mmap(NULL, M * CL,
PROT_READ | PROT_WRITE,
MAP_PRIVATE | MAP_ANONYMOUS | MAP_POPULATE, -1, 0);

size_t access_times[M];
for(int i = 0; i < M; i++) {
access_times[i] = 0;
}

// # of measurements
for(int n = 0; n < N; n++) {

    // only probe one cacheline per experiment
    for(int el = 0; el < M; el++) {

        // flush the probing array
        for(int i = 0; i < M; i++) {
            _mm_clflush(probe_array + i * CL);
        }
        _mm_mfence();

        // Desired access pattern
        *(volatile char*)(probe_array + TARGET * CL);
        _mm_mfence();

        // check which elements have been prefetched
        access_times[el] += measure_access(probe_array + el * CL);
    }
}
// ...

static inline int measure_access(char *addr) {
    unsigned int t0 = 0;
    unsigned int t1 = 0;
    u_int64_t t00 = 0;
    u_int64_t t01 = 0;

    _mm_mfence();
    t00 = __rdtscp(&t0);
    _mm_mfence();

    *(volatile char *) addr;

    _mm_mfence();
    t01 = __rdtscp(&t1);
    int cycles = (int) (t01 - t00);
    return cycles;
}
```

{{< /details >}}


<!-- ### L2 Hardware Prefetcher -->

### L2 Streamer: Prefetched cache lines must be in the same 4K page
In this experiment, we try to reproduce the L2 Streamer prefetch behavior across
a 4K page. We disable all prefetchers except Streamer.

> [Streamer] When a forward or backward stream of requests is detected, the anticipated cache lines are prefetched. **Prefetched cache lines must be in the same 4K page.**
>
> -- Intel 64 and IA-32 Architectures Optimization Reference Manual

We access several cache lines in sequence (green) and probe the array for hits
introduced by the prefetcher (red). Cache misses are marked in gray.

In the graphs depicted below, we can clearly see that no prefetching occurs
across a 4KB page boundary, despite the access of cache lines 50 to 63. This is
consistent with the information we found. Interestingly, the first two cache
lines of every page in the probing array are always prefetched (why so?).

[![l2stream_pageboundary1](/blog/2022-09-prefetching/page_boundary_50_a.png)](/blog/2022-09-prefetching/page_boundary_50_a.png)
{{<caption >}} Probe cache lines 50 to 54 (green), prefetching of cache line until 60 (red). {{< /caption >}}

[![l2stream_pageboundary2](/blog/2022-09-prefetching/page_boundary_50_60.png)](/blog/2022-09-prefetching/page_boundary_50_60.png)
{{<caption >}} Probe cache lines 50 to 59 (green), prefetching of cache line
until 65 (red) (prefetched until 63, and page-boundary always prefetched (64, 65
as well as 0, 1)) {{< /caption >}}

[![l2stream_pageboundary3](/blog/2022-09-prefetching/page_boundary_50_63.png)](/blog/2022-09-prefetching/page_boundary_50_63.png)
{{<caption >}} Probe cache lines 50 to 63. No prefetching across a page boundary. {{< /caption >}}

What happened is that we initiated a new stream, determined its direction, and
confirmed the access pattern so that L2 Streamer started to prefetch multiple +1
cache lines ahead. The prefetching stops at the page boundary. This is
consistent with the manual.

However, it remains unclear why we receive a cache hit in the first two cache
lines of every page.

### L2 Streamer: Prefetch Aggressiveness
Regarding the number of lines to prefetch ahead, the manual reads the following bits:

> [L2 Streamer] Enhancement to the streamer includes the following features:
> - The streamer may issue **two prefetch requests on every L2 lookup**. The **streamer can run up to 20 lines ahead of the load request.**
> 
> - Adjusts dynamically to the number of outstanding requests per core. If there are **not many outstanding requests, the streamer prefetches further ahead**. If there are many outstanding requests it prefetches to the LLC only and less far ahead.
>
> -- Intel 64 and IA-32 Architectures Optimization Reference Manual

The experiments shown below demonstrate prefetching behavior following a linear
access pattern. We notice L2 Streamer prefetching starting with the second
memory access.


[![stream](/blog/2022-09-prefetching/init_prefetch_1.png)](/blog/2022-09-prefetching/init_prefetch_1.png)
{{<caption >}}L2 Streamer, One memory access, no prefetching {{</caption >}}
[![stream](/blog/2022-09-prefetching/init_prefetch_2.png)](/blog/2022-09-prefetching/init_prefetch_2.png)
{{<caption >}}L2 Streamer, 2 memory accesses, 2 cache lines prefetched
{{</caption >}}


[![stream](/blog/2022-09-prefetching/init_prefetch_3.png)](/blog/2022-09-prefetching/init_prefetch_3.png)
{{<caption >}}L2 Streamer, 3 memory accesses, 3 cache lines prefetched {{< /caption >}}

Increasing the number of consecutive memory accesses increases the number of
prefetched lines. With an access strike of 30 consecutive cache lines, we manage
to prefetch 32 cache lines ahead, which is higher than what we found in the
manual (20 lines). However, around 16 prefetched lines, we notice higher access
times so they may hit the L3 cache.


[![stream](/blog/2022-09-prefetching/stride_1_15.png)](/blog/2022-09-prefetching/stride_1_15.png)
{{<caption >}}L2 Streamer, 15 memory accesses, 17 cache lines prefetched
{{</caption >}}
[![stream](/blog/2022-09-prefetching/stride_1_30.png)](/blog/2022-09-prefetching/stride_1_30.png)
{{<caption >}}30 Streamer, 30 memory accesses, 32 cache lines prefetched
{{</caption >}}

For different linear access strides larger than 2, we consistently
see two consecutive cache lines prefetched. 

The experiments below depict stride sizes of 4, 9, and 32 cache lines. On every
L2 lookup, the prefetcher requests two accesses. This is also consistent with
the information we found online.


[![stream](/blog/2022-09-prefetching/stride_4.png)](/blog/2022-09-prefetching/stride_4.png)
{{<caption >}}L2 Streamer, Linear access pattern with stride size of 4. Each
access causes 2 additional prefetches. {{< /caption >}}

[![stream](/blog/2022-09-prefetching/stride_9.png)](/blog/2022-09-prefetching/stride_9.png)
{{<caption >}}L2 Streamer, Linear access pattern with stride size of 9. Each
access causes 2 additional prefetches. {{< /caption >}}

[![stream](/blog/2022-09-prefetching/stride_32.png)](/blog/2022-09-prefetching/stride_32.png)
{{<caption >}}L2 Streamer, Linear access pattern with stride size of 32. Each
access causes 2 additional prefetches. {{< /caption >}}


### L2 Adjacent: Prefetch on a 128 bytes boundary
The adjacent L2 cache line prefetcher prefetches one additional cache line such
that two cache lines on a 128 bytes boundary are always in the cache. Put
differently, the manual reads:

> [L2 Adjacent] This prefetcher strives to complete every cache line fetched to
> the **L2 cache with the pair line that completes it to a 128-byte aligned
> chunk.**
>
> -- Intel 64 and IA-32 Architectures Optimization Reference Manual

<!-- As an example, if we access cache line 42, the prefetcher will fetch cache line -->
<!-- 43, and if we access cache line 37, the 128 byte boundary includes cache -->
<!-- line 36.  -->

This is demonstrated with the following two experiments. All prefetchers except
the L2 Adjacent are disabled.

[![l2adj1](/blog/2022-09-prefetching/adjacent_1.png)](/blog/2022-09-prefetching/adjacent_1.png)
[![l2adj2](/blog/2022-09-prefetching/adjacent_2.png)](/blog/2022-09-prefetching/adjacent_2.png)
{{<caption >}} Prefetch behavior of L2 Adjacent Prefetcher. Behavior is ahead as
well behind, depending on the 128 bytes alignment of the cache line
accessed.{{</caption >}}

The L2 Adjacent cache line prefetcher seems to consistently prefetch one cache
line on every access.

<!-- I did not find an access pattern which does not cause a prefetch along the -->
<!-- 128 bytes boundary. -->

## Summary
As for the remaining two L1 prefetchers I currently do not have reliable results
to blog about. To summarize, we discussed the following findings:

_1. Find out which prefetchers are available on my hardware_ 

- L2: Hardware Prefetcher
- L2: Adjacent Cache Line Prefetcher
- L1: Data Cache Unit (DCU) Hardware Prefetcher
- L1: Data Cache Unit (DCU) IP Prefetcher

_2. If a prefetcher is active, how large is the prefetch size_
- The L2 Stream prefetcher (Streamer) can prefetch up to ca. 30 cache lines, but
  not across page boundaries. Some prefetched cache lines may end up in LLC
  instead of L2.
- The L2 Adjacent Cache Line prefetcher always prefetches one additional cache line, such that 2 cache lines are 128 bytes aligned.  
- The L1 Hardware and IP prefetchers are still uncovered in this blog post. The
  received results are imprecise. These prefetchers include a streamer and a
  stride prefetcher.

_3. And which memory accesses do and do not trigger a prefetch_
- The L2 Stream prefetcher is triggered after accessing 2 consecutive cache
  lines. Once an access pattern has a stream table entry, it will reliably
  receive prefetches. For stride sizes larger than 2, Streamer will issue two +1
  prefetches for every cache line accessed. Interestingly, in the conducted
  experiments we always received cache hits in the first two cache lines of
  every page (Why?).
- The L2 Adjacent cache line prefetcher caches one additional cache line.

## Epilogue
Working on this topic has been fun. Hardware prefetchers remain mostly (for me)
a black-box and the results shown in this post are drop in the ocean. I hope
that these insights will help me to more often look across levels of
abstractions and to better understand why things work the way they do.

[Part 2](/blog/2022/prefetching-side-channel/) will use this information here
and will try to build a cache side-channel attack with a minimal buffer size
(e.g. solely 256 cache lines instead of many pages) and a custom access pattern
to avoid unwanted prefetches. Stay tuned :)

Thanks for reading   
-- bean

## Literature
The following work from academia includes some interesting readings:

<cite>Rohan et al.[^streamer]</cite> studied the stream direction, trigger, and
prefetch degree of L2 Hardware Prefetcher (Streamer) in experiments running
multiple threads on the same physical core. <cite>Wang et al.[^wang]</cite>
analyzed prefetching and replacement policy on several CPUs and further designed
a prime and probe attack that minimizes the impact of prefetching.


[^streamer]: Rohan, Aditya and Panda, Biswabandan and Agarwal, Prakhar, 2020,
[Reverse Engineering the Stream Prefetcher for
Profit](https://ieeexplore.ieee.org/document/9229804), 2020 IEEE European
Symposium on Security and Privacy Workshops (EuroS PW)

[^wang]: Wang, Daimeng and Qian, Zhiyun and Abu-Ghazaleh, Nael and
    Krishnamurthy, Srikanth V, 2019, [PAPP: Prefetcher-Aware Prime and Probe
    Side-channel Attack](https://ieeexplore.ieee.org/document/8806941), 2019
    56th ACM/IEEE Design Automation Conference (DAC)


## Credits
Thanks to Michael Roth who worked together with me on the topic. 
