---
title: "Receiving Hundreds of Postcards from the Internet"
slug: "receiving-postcards"
description: ""
draft: false
date: "2022-08-25"
tags:
  - programming
  - reversing
---
In this post, I blog about
[postcard_creator](https://github.com/abertschi/postcard_creator_wrapper) and
[postcards](https://github.com/abertschi/postcards). An Android and REST
endpoint reversing project I created to send free postcards in Switzerland. I
built [postcard-love](https://postcard.abertschi.ch), a website to allow
strangers to send me postcards for free. Over the past time, I have received
hundreds of cards. Some more unusual than others. <!--more-->


![postcards](/blog/2022-08_postcards/postcards.jpg)
{{<caption >}} Some of the postcards I received from the interwebs.{{< /caption >}}

---

{{< toc >}}

## Background
The Swiss Postal Service offers a free service to send postcards within
Switzerland in their Android/iOS apps. Swiss residents with a _SwissPass_ are
eligible to register at
[https://service.post.ch](https://service.post.ch/pccweb/public/ui/view/home?shortcut=postcardcreator)
to design and send postcards online. Their service includes a free postcard
every 24 hours. However, it is hidden in their Android/iOS apps and only
accessible there.

This project aims to reverse these apps and build an API wrapper that will
automate and expose this functionality.

## The Project
The project consists of three components. A _REST API wrapper_, a
_command-line application_, and a _demo application_  to receive cards from
strangers online.


### REST API Wrapper
The API wrapper is written in Python and implements authentication modes with
username/password (now discontinued) and SwissID SAML/OAuth authentication.
As far as I can tell, no countermeasures are implemented to hinder the endpoint
reversing. OAuth follows an Authorization Code Flow with a [Proof Key for Code
exchange (PKCE)](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-proof-key-for-code-exchange-pkce).

The user-facing API is fairly simple and resembles the REST endpoints:

```python
from postcard_creator.postcard_creator import PostcardCreator, Postcard, Token, Recipient, Sender

token = Token()
token.fetch_token(username, password)
token.has_valid_credentials(username, password)
recipient = Recipient(prename, lastname, street, place, zip_code)
sender = Sender(prename, lastname, street, place, zip_code)

picture = open('./my-photo.jpg', 'rb')
card = Postcard(message, recipient, sender, picture)

w = PostcardCreator(token)
w.send_free_card(postcard=card, mock_send=False, image_export=False)
```

You find the API wrapper on
[GitHub](https://github.com/abertschi/postcard_creator_wrapper).

### Command-line Application
_Postcards_ is a command-line application built around the REST API. It comes
with different modes including:

- Bulk sending cards from a folder,
- Slicing a picture into tiles of many cards,
- Sending stock images,
- Sending quotes from _Chuck Norris_ (be aware, his first program was kill -9!),
- Sending random pictures from the internet (without filtering, may not be SFW).


<!-- ```bash -->
<!-- $ postcards-chuck-norris send --config ./config.json -->
<!-- # Chuck Norris's first program was kill -9! -->
<!-- ``` -->

```bash
$ postcards send --config config.json \
    --picture https://images.pexels.com/photos/365434/pexels-photo-365434.jpeg \
    --message "Happy coding!"
```
You find the command-line application on [GitHub](https://github.com/abertschi/postcards).

### Receiving Cards from Strangers
Having the API wrapper implemented, we can now take on to build [Postcard-love](https://postcard.abertschi.ch/), a small web application to
upload an image and write some text. Cards uploaded on the site are then
enqueued and sent to my home address using the aforementioned projects. 

[![postcards](/blog/2022-08_postcards/postcard-love.png)](https://github.com/abertschi/postcard-love/blob/master/.assets/postcard-love-ui.pdf)
{{<caption >}} Webapp to send free cards. See more design assets and the source code
[here](https://github.com/abertschi/postcard-love/blob/master/.assets/postcard-love-ui.pdf).{{<
/caption >}}

<!-- I integrated nudity detection to exclude inappropriate content to be sent out.  -->

Now, all that was left is to wait and see if someone bothered to write a card...

## Shout-Outs
In the next paragraphs, I will highlight some of the cards received. Thanks to
everyone who made an effort and sent me a card!

I want to shout out to _truck driver Ahramov_. Whether you are real or not,
thanks for the message! I hope the _gud truck_ still drives :).

```
zis is se truck in se uzbekiztan. itz not mi truck but gud truck frm the sovjet, gud times. veri gud regards
-- truck drivr ahramov 
```

![postcards](/blog/2022-08_postcards/truck.jpg)
{{<caption >}} truck drivr ahramov's truck.{{< /caption >}}


Also a shout-out to this gentleman, who took corona measures very cautionary
:). Thanks for all the love, stay healthy!

```
Love your stuff. 
Stay corona-free! (That's me in the pic FYI lol)
```

![postcards](/blog/2022-08_postcards/card.png)
{{<caption >}} Stay healthy and strong.{{< /caption >}}


And last but not least, a warm thanks for this picture. It's a nice wall :).

```
This is our cat-postcard wall, all sent using your python wrapper.
Thanks a lot :)
-- Someone from the cloud
```

![postcards](/blog/2022-08_postcards/cats.jpg)
{{<caption >}} Cat-postcard wall from someone from the cloud.{{< /caption >}}


## Conclusion

From cute cat pictures, landscape and architecture, obscure images and trash,
selfies, and even a request for a date, I received many postcards.

> A smile is happiness you'll find right under your nose.   
> -- Tom Wilson  

The reverse engineering work of this project has been much fun, almost as much
fun as receiving the cards. The projects are activiely maintained and (usually) quickly fixed if something breaks.
Thanks everyone for playing along and making me, the postman, and my roommates smile.


Thanks for reading.  
-- bean
