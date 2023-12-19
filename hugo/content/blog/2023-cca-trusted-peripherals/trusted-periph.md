---
title: "Protecting Accelerator Execution with Arm CCA"
date: "2023-08-29"
slug: "cca-trusted-periph"
description: ""
draft: false
toc: true
tags: [
    "linux", "security", "tee"
]
---
In this blog post, I highlight the results of a research project I collaborated
on as part of my graduate studies at ETH Zurich. It is based on Arm's
Confidential Compute Architecture, a new set of hardware and software primitives
in upcoming Armv9-based CPUs. Confidential Computing is an emerging field in
cloud computing that aims to protect sensitive information from potential
threats. This is accomplished with a set of firmware and hardware features in
the CPU and aims to shield user data and code from unauthorized access, for
instance by a malicious system administrator or a malevolent hypervisor. An
interesting open research problem is how we can employ a [trusted execution
environment](https://en.m.wikipedia.org/wiki/Trusted_execution_environment)
across the boundary of the CPU to include external devices. In cloud settings,
powerful CPU cores are increasingly linked with [specialized PCIe-based
accelerators](https://aws.amazon.com/nvidia/) such as graphic cards, showing
that there is an interest to confidentially interact with external devices.


<!--more-->

![cca](/blog/2023-cca-trusted-peripherals/cca.png)


---

## Abstract

[Confidential
Computing]((https://en.m.wikipedia.org/wiki/Confidential_computing)) is an
emerging field in cloud computing that aims to protect sensitive information
from potential threats. Hardware-based trusted execution environments shield
user data and code from unauthorized access by a malicious tenant on the system.
While current implementations focus on process-level abstraction, there has been
a trend toward isolating confidential information at the virtual machine level.
However, integrating confidential devices often requires specialized hardware or
encryption, leading to increased computation overhead and compatibility issues.
Arm confidential computing architecture ([Arm
CCA](https://www.arm.com/architecture/security-features/arm-confidential-compute-architecture))
enables trusted execution environments on the new generation of Armv9-A
processors. It uses a specific set of design choices to enable powerful VM-based
isolated execution. However, it lacks support for powerful accelerators
connected via PCIe. We propose a system to make confidential PCIe-based
accelerators compatible with Arm CCA without requiring hardware changes or
encryption. We implement our approach on the [Arm Fixed Virtual
Platform](https://developer.arm.com/Tools%20and%20Software/Fixed%20Virtual%20Platforms)
simulation software, using an escape mechanism to communicate with connected
devices. Through evaluation with FPGA and GPU accelerators, we demonstrate that
our method incurs lower overhead than encryption-based approaches. Although
based on simulations, this work provides insights into the potential benefits of
integrating confidential PCIe-based accelerators into Arm CCA.


![cca](/blog/2023-cca-trusted-peripherals/fpga2.png)


## Technical Report, Plots and Figures

You may download the technical report here, I am planning to open source the
artifacts later on.

Thesis: *[Protecting Accelerator Execution with Arm Confidential
Computing](/blog/2023-cca-trusted-peripherals/eth_mthesis_cca.pdf)*



**Lack of Real Hardware.** Arm's Confidential Computing architecture is still
actively developed and the new generation of [Armv9-based
CPUs](https://www.arm.com/company/news/2021/03/arms-answer-to-the-future-of-ai-armv9-architecture)
are not available yet in silicon. To address this issue, Arm provides a
simulation software called Fixed Virtual Platform (FVP). It is proprietary
software and simulates complete Arm-based systems from CPUs to
microarchitectural behavior. However, the simulation does not provide a
functional interface to connect to PCIe devices and hence can not interact with
accelerators such as GPUs and FPGAs, which is instrumental to demonstrate and
evaluate confidential interactions with external devices.

**Challenges and Outlook.** One of my primary efforts in this collaboration have
been to bridge the gap between simulating non-existing hardware and interaction
with functional real world accelerators. This required to build a
trap-and-emulate style escape mechanism out of the simulated Arm system and
allowed us to experiment with Arm CCA and accelerators even though hardware
implementations are unavailable in silicon yet.

<!-- I am planning to write another blog post to detail some of the technical
challenges that I tackled. For now, you find them in the attached technical -->
<!-- report. -->

With this thesis, I am also finishing my graduate program in Computer Science at
ETH Zurich and starting a position as a Scientific Engineer at the [Secure and
Trustworthy Systems Group](https://sectrs.ethz.ch/) at ETH Zurich. I'm eagerly
anticipating this opportunity and looking forward to delving deeper into the
realm of trusted computing through further research.



Happy hacking and thanks for reading.  
-- bean

-------

**Update: 29. September 2023:** I am thrilled to announce that our work on
  _Protecting Accelerator Execution with Arm Confidential Computing Architecture_
 will be included in the program of USENIX Security 2024.
 
 https://arxiv.org/abs/2305.15986
 
   
**Update: 27. October 2023:** I prepared the research artifact for USENIX Security
 artifact evaluation 2024 and open-sourced all the software components. We have
 reproducible builds for benchmarks, Linux kernels, TFA, RMM and
 escape mechanisms.
 
 https://github.com/sectrs-acai
 
 **Update: 11. December 2023:** We got all requested badges (available and functional)
 in the artifact evaluation process. The provided GitHub runner for Continuous Integration
 served as a valuable resource to solve build-related challenges that may have arised
 and helped the reviewer to build and evaluate ACAI's functionality claims. 
 
 I am happy to see that all 4 reviewers rated the artifact as:
 
 _Well-developed software, fairly extensive documentation, reasonable software engineering, attention to usability._
 
 <!-- [acai-ratings](/blog/2023-cca-trusted-peripherals/acai-ae-rating.png) -->


 This despite ACAI's complexity with
 [16 git submodules](https://github.com/sectrs-acai/acai/blob/trusted-periph/master/.gitmodules), [3 hour artifact
 build](https://web.archive.org/web/20231211165113/https://github.com/sectrs-acai/acai/actions/runs/6638554927/job/18035123635)
 (100 GB temp. storage), and cross compilation of kernels, root file systems,
 device drivers and firmware.
 
<!-- Document: [Usenix Security '24 Artifact Evaluation](/blog/2023-cca-trusted-peripherals/23-12-11b-acai_usenix_artifact_eval.pdf) -->

-------


_Plots and Figures_

![cca](/blog/2023-cca-trusted-peripherals/gpu-data.png)

![cca](/blog/2023-cca-trusted-peripherals/fpga-data.png)

![cca](/blog/2023-cca-trusted-peripherals/elsplit-data.png)

![cca](/blog/2023-cca-trusted-peripherals/escape.png)
![cca](/blog/2023-cca-trusted-peripherals/escape2.png)
![cca](/blog/2023-cca-trusted-peripherals/gdev.png)




