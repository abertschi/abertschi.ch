---
title: "Easter Eggs on abertschi.ch"
slug: "overengineering-my-website-with-easter-eggs"
draft: false
date: "2022-08-20"
tags:
  - programming
---
In this post, I write about the conversational chat interface I built
into the intro page of this website. You can try it out at the root site of
[abertschi.ch](/) -- Type some text in the text area and see what happens.
<!--more-->
---

## Background
I finally found the time to add some Easter eggs to the intro site of my
website. This is a small project I have wanted to build for a few years but
never found the time. The website is a conjunction of a static site generator
and a self-built intro page. The site works just fine without JavaScript and
contains little styling, inspired [by this ludicrous
website](http://bettermotherfuckingwebsite.com/) (which has some fair points)
and [this](https://github.com/HermanMartinus/bearblog/) blog framework.

## Technology Stack
To encourage blogging I opt for [Hugo](/), a static site generator to generate
HTML based on Markdown. I mainly choose Hugo because of
[ox-hugo](https://github.com/kaushalmodi/ox-hugo), an `Org Mode` exporter
backend for Hugo, but so far I am still writing this blog post in Markdown and
not Org.


The intro page at the root of this domain is self-built with TypeScript,
Vue.js, and a Golang REST backend in Gin. It features a small TypeScript
app (~ 600 loc) with a conversational chat interface. The golang backend is
containerized with Docker and exposed to the interwebs with Nginx.

The frontend builds with continuous delivery (CD) and deploys itself [upon new
commits](https://github.com/abertschi/abertschi.ch/actions/workflows/deploy.yml).



```
SOME THINGS TO DO ON THIS SITE:
- SEND ME A POSTCARD
- READ MY BLOG
- REACH OUT TO ME AT SAYHI at ABERTSCHI.CH
- BROWSE MY CV
- FOLLOW ME ON GITHUB OR TWITTER

$ help
Some things you may want to do...:
help......: this
clear.....: clear the screen
reset.....: reset conversation state
history...: see what you accomplished
```
{{< caption >}}Excerpt from chat interface.{{< /caption >}}

The chat interface keeps track of the chat history and implements local and
remote commands. Local commands are implemented in the browser. If no local
command is matched, the browser sends the chat message to the server, where it
receives a server-generated response. This architecture is motivated not to
spoil some Easter eggs implemented on the site.

## Easter Eggs are Stages
The Easter eggs are implemented in _Stages_ on the server.
```go
type StageHandler interface {
  CanHandle(stage string) bool
  FormulateReply(msg string, ctx []string) Response
  NextStage() string
  GetStage() string
  FormulateSummary() Response
}
```
{{< caption >}}Each egg is implemented with a StageHandler.{{< /caption >}}

Each _stage_ decides if it `CanHandle` the current request, and if so, what
`Response` it will formulate (`FormulateReply`). This allows for server-side
rendering of HTML code which can subsequently be shown on the client. To
formulate a reply, a stage receives a messaging context of the last N questions
asked.

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
{{< caption >}}A server response can embed HTML on the client.{{< /caption >}}

A server `Response` can contain text, HTML code, and a`Stage` identifier. The
client then includes the stage in subsequent requests until the stage is solved
and the server replies with a new Easter egg. This simple design encapsulates an
implementation of an Easter egg from the rest of the server code.

## Conclusion

This small project has been fun to build. You can try it out at https://abertschi.ch. The source code is available on [GitHub](https://github.com/abertschi/abertschi.ch/blob/master/app/frontend/src/components/AppConversation.vue).

I may add some GPT-J alike functionality in a later update. Until then, the Easter eggs are small riddles that show themselves in quotes and sentences. You can follow up by asking specific questions until you find out what the riddle wants you to ask or do. 

```
> Everything that follows, is a result of what you see here.  
> I am sorry. My responses are limited.  
> You must ask the right questions.  

$ and more ...
```

Good luck! 😉

Thanks for reading.  
-- bean
