---
title: "Overengineering my website with Easter Eggs"
description: ""
draft: false
date: "2022-08-01"
tags:
  - engineering
  - go
  - typescript
---
TLDR: In this post I write about the conversational chat interface I built
into the intro page of this website. You can try it out at the root site of
[abertschi.ch](/) -- Type some text in the text area and see what happens.
<!--more-->
---

## Background
I finally found the time to add some Easter Eggs to the intro site of my personal website. This is a small project I have wanted to build for a few years but never found the time. The website is a conjunction a static site generator and a self-built intro page. The site works just fine without JavaScript and contains little to almost no styling, inspired [by this ludicrous website](http://bettermotherfuckingwebsite.com/) (which has some fair points).

## Technology Stack
To encourage blogging I opt for [Hugo](/), a static site generator to generate HTML based on Markdown. I mainly choose Hugo because of [ox-hugo](https://github.com/kaushalmodi/ox-hugo), an `Org Mode` exporter backend for Hugo, but so far I am still writing this blog post and Markdown and not Org.


The intro page at the root of this domain is self-built with `TypeScript`,
`Vue.js` and a `Golang` REST backend in `Gin`. It features a small
`TypeScript` app (~ 600 loc) with a conversational chat interface. The golang
backend is containerized with `Docker` and exposed to the interwebs with `Nginx`. 

The frontend runs with continuous delivery (CD) and builds and deploys itself [upon new commits](https://github.com/abertschi/abertschi.ch/actions/workflows/deploy.yml).



```
SOME THINGS TO DO ON THIS SITE:
- SEND ME A POSTCARD
- READ MY BLOG
- REACH OUT TO ME AT SAYHI@ABERTSCHI.CH
- BROWSE MY CV
- FOLLOW ME ON GITHUB OR TWITTER

$ help
Some things you may want to do...:
help......: this
clear.....: clear the screen
reset.....: reset conversation state
history...: see what you accomplished
```

The chat interface uses `LocalStorage` to keep track of the chat history and implements local and remote commands. Local commands are implemented in TypeScript in the browser. If no local command is matched, the browser sends the chat message to the server where the server generates chat response. This architecture is motivated not to spoil some of the easter eggs implemented on the site.

## Easter Eggs are Stages
The Easter Eggs are implemented in _Stages_ on the server.
```go
type StageHandler interface {
  CanHandle(stage string) bool
  FormulateReply(msg string, ctx []string) Response
  NextStage() string
  GetStage() string
  FormulateSummary() Response
}
```
Each _stage_ decides if it `CanHandle` the current request, and if so, what `Response` it will formulate (`FormulateReply`). This allows for server side rendering of HTML code which can subsequently be shown on the client. To formulate a reply, a stage receives a messaging context of the last N questions asked.

```go
type Response struct {
  Stage     string          `json:"stage"`
  Responses []ResponseEntry `json:"responses"`
}
type ResponseEntry struct {
  Html      string          `json:"html"`
  Sentences []string        `json:"sentences"`
}
```
A server `Response` contains text and HTML code and a `Stage` identifier. The client then includes the stage in subsequent requests until the stage is solved and the server replies with a new Easter Egg. If no _Stage_ is present, the server will start with the first Easter Egg. This simple design encapsulates an Easter Egg from the rest of the server code and allows to easily add more Easter Eggs.

## Try it out

Try it out at https://abertschi.ch. I will add some more stages if I find the
time. The frontend code is open-source on
[GitHub](https://github.com/abertschi/abertschi.ch). However, I will keep the
server code and the Easter Eggs hidden for now. Unless you find them :).

Thanks for reading.  
-- bean
