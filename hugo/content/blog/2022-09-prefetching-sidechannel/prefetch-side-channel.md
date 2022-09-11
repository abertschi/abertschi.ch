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
using a minimal probing buffer size, e.g. 256 x 64 bytes, and a
custom access pattern such that prefetchers do not cause unwanted cache hits and
screw up the attack. 

## Background
In practise, the less contiguous memory is required, the
easier the attack is to implement. 


### The Cache is the Side Channel


## Threat Model

## Experiments

## Conclusion

## Credits
