---
title: "Graalphp: An efficient PHP implementation on GraalVM"
date: "2020-08-01"
description: ""
draft: false
toc: true
tags: [
    "programming"
]
---
Graalphp is an experimental just-in-time (JIT) compiler and runtime for PHP 7.4+
hosted on GraalVM. A research project I started in 2020 at the [Advanced
Software Technologies (AST)](https://ast.ethz.ch/) lab at ETH Zurich. Graalphp
implements a small subset of the PHP 7 specification and shows promising results
in synthetic benchmarks. You find its source-code on
[GitHub](https://github.com/abertschi/graalphp). <!--more-->

---

## Abstract
PHP is a popular, weakly typed, general purpose programming language. Originally
designed for building dynamic web pages, the language has since gained wide
adoption in server-side web development. In this work, we describe the design
and implementation of graalphp, an experimental compiler and runtime for PHP
hosted on Truffle and GraalVM. [GraalVM](https://www.graalvm.org/) is a virtual
machine that supports execution of multiple languages, which are implemented as
Abstract Syntax Tree (AST) interpreters based on Truffle. GraalVM uses Graal as
its JIT compiler to compile frequently executed code fragments to machine code.
We implement a subset of the PHP language to run synthetic benchmarks by [The
Computer Language Benchmarks
Game](https://benchmarksgame-team.pages.debian.net/benchmarksgame/index.html).
We compare peak performance of our implementation against PHP 7 as well as
alternative implementations such as [HHVM](https://hhvm.com/),
[JPHP](https://github.com/jphp-group/jphp) and an early alpha version of PHP 8.
Experimental results indicate that our runtime reaches competitive results with
performance gains of up to 859% compared to PHP 7. These preliminary results
suggest that a Truffle-hosted PHP implementation might be significantly faster
than existing language implementations.

![image](/blog/2020_graalphp/image_2020-09-06_12-36-43.png) {{< caption >}} High
level overview of architecture. {{< /caption >}}

## Technical Talk
{{< rawhtml >}} <iframe style="width: 100%" height="300px"
src="https://www.youtube.com/embed/Dzahabn8ojo" title="YouTube video player"
frameborder="0" allow="accelerometer; autoplay; clipboard-write;
encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe> {{<
/rawhtml >}}


## Report and Preliminary Results
Please consider the [technical
report](https://abertschi.ch/default_public/ethz/graalphp/download.php) and
[source-code](https://github.com/abertschi/graalphp). The following figures are
excerpts from the report.

#### Peak Performance
![img1](/blog/2020_graalphp/image_2020-09-06_12-35-34.png)
![img2](/blog/2020_graalphp/image_2020-09-06_12-35-57.png)
![img3](/blog/2020_graalphp/image_2020-09-06_12-36-09.png)


#### Warm-up
![img4](/blog/2020_graalphp/image_2020-09-02_19-17-24.png)
![img5](/blog/2020_graalphp/image_2020-09-02_19-16-51.png)


## Press Coverage and Discussions
- [Hackernews](https://news.ycombinator.com/item?id=24565930)
- [Phoronix.com](https://www.phoronix.com/news/GraalPHP-GraalVM-PHP)
- [Reddit](https://www.reddit.com/r/PHP/comments/j22xje/859_php_performance_improvement_from_php_7_and/)
- [Programmez.com](https://www.programmez.com/actualites/graalphp-une-implementation-de-php-sur-graalvm-30958)
- [Oschina.net](https://www.oschina.net/news/118944/graalphp-graalvm-php?p=2)
- [Github feature request](https://github.com/oracle/graal/issues/361)
- [Twitter](https://twitter.com/thomaswue/status/1305845567415824384)


