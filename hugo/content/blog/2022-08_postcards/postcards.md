---
title: "Receiving Hundreds of Postcards from Strangers online"
description: ""
draft: false
date: "2022-08-01"
tags:
  - programming
  - reversing
---

In this post I document some thoughts on
[postcard_creator_wrapper](https://github.com/abertschi/postcard_creator_wrapper)
and [postcards](https://github.com/abertschi/postcards). An Android and REST
reversing project I started to send free postcards in Switzerland. While you are
reading this, consider writing me a free postcard at
[postcard.abertschi.ch](https://postcard.abertschi.ch).

<!--more-->


![postcards](/blog/2022-08_postcards/postcards.jpg)
{{<caption >}} Some of the postcards which I received from strangers of the interwebs.{{< /caption >}}

---

{{< toc >}}

## Background
The Swiss Postal Service offers a free service to send postcards within
Switzerland in their Android/iOS apps. Swiss residents with a [SwissPass]() are
eligible to register at
[https://service.post.ch](https://service.post.ch/pccweb/public/ui/view/home?shortcut=postcardcreator)
to design and send postcards online. Their service includes a free postcard
every 24 hours. However, this service is hidden in their Android/iOS apps and
only accessible there. 

The aim of this project is to reverse these apps and build an API wrapper to
then automate and expose this functionality. 
## The Project
The project consists of three components. An [REST API wrapper](), a [CLI client]() and a [demo application]() to demonstrate the functionality.

### REST API Wrapper
The API wrapper is written in Python and implements authentication modes with
username/password (now discontinued) and SwissID SAML/OAuth authentication.
As far as I can tell, no counter measures are implemented to hinder the endpoint
reversing. OAuth follows an Authorization Code Flow with a [Proof Key for Code
exchange
(PKCE)](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-proof-key-for-code-exchange-pkce).

The user-facing API is fairly simple and resembles the REST endpoints:

```python
from postcard_creator.postcard_creator import PostcardCreator, Postcard, Token, Recipient, Sender

token = Token()
token.fetch_token(username, password)
token.has_valid_credentials(username, password)
recipient = Recipient(prename, lastname, street, place, zip_code)
sender = Sender(prename, lastname, street, place, zip_code)

picture=picture_stream=open('./my-photo.jpg', 'rb')
card = Postcard(message, recipient, sender, picture)

w = PostcardCreator(token)
w.send_free_card(postcard=card, mock_send=False, image_export=False)
```

You find the API wrapper on [GitHub](https://github.com/abertschi/postcard_creator_wrapper).

### CLI Client
With a command-line interface the API wrapper can easily be invoked in a cronjob.
There is not too much to tell here, you find the client on
[GitHub](https://github.com/abertschi/postcards).

It comes with different modes to:
- Bulk send cards from a folder,
- Send an image from an image hosting site,
- Send cards with quotes of Chuck Norris,
- Or to randomly pick a card from the internet (may not be SFW).



<!-- ```bash -->
<!-- $ postcards send --config config.json \ -->
<!--     --picture https://images.pexels.com/photos/365434/pexels-photo-365434.jpeg \ -->
<!--     --message "Happy coding!" -->
<!-- ``` -->



### Receiving cards from Strangers

![postcards](/blog/2022-08_postcards/postcard-love.png)
{{<caption >}} Webapp to send free cards. See [more design assets here](https://github.com/abertschi/postcard-love/blob/master/.assets/postcard-love-ui.pdf).{{< /caption >}}



## Shout Out to Ahramov

I want to shout out to _truck driver ahramov_. Whether real or not, thanks for
the message! I hope the _gud truck_ still drives :).

```
zis is se truck in se uzbekiztan. itz not mi truck but gud truck frm the sovjet, gud times. veri gud regards
-- truck drivr ahramov 
```


![postcards](/blog/2022-08_postcards/truck.jpg)
{{<caption >}} truck drivr ahramov's truck.{{< /caption >}}


Thanks for reading.  
-- bean
