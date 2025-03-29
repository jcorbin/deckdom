# 2025-03-29

## Design Muse

- "natural" user actions:
  - pickup 1 card ... N cards ... whole stack ; merges with any prior held card/stack
  - place 1 card ... N cards ... whole held stack
  - nominate place
    1. "this is the 'draw pile'"
    2. "this is the 'discard pile'"
    3. "this is the 'query'"
  - swap to off hand
  - rotate card or stack:
    - Z is free rotation, maybe snapped to 45 or 90 degree increments
    - X and Y are flips of the held card ...
    - ... maybe valid to flip a stack on edge tho, so 90 degree increments, but only when held, not when on table
  - riffle held stack to placed stack
  - riffle 2 held stacks
  - bridge held riffle
  - settle riffle
  - fan held stack
  - split held stack ( holding 2 stack, basically a gap pointer )
  - swap N cards into split gap
  - spread stack on table ; creates chain of cards?

- "artificial" user actions:
  - sort stack ; restore original order
  - RNG shuffle stack ; auto prng vs user entropy provided by wiggle/shake
  - gather all cards to nominated place
  - scatter all cards from stack across board ; avoid nominated places?

## TODO

- actions that should be possible:
  - [x] move card(s)
  - [~] take card(s)
  - [~] flip card
  - [ ] rotate card sideways ; also odd angles?
  - [ ] place card(s)
  - [ ] place part of stack
  - [~] cut stack ... short cut for take / place?
  - [ ] rotate held stack ; nominal reverse
  - [ ] RNG shuffle 1 stack
  - [ ] shuffle 2 stacks: riffle ; other methods?
  - [ ] nominate stack ; define place
  - [ ] place actions: gather all ; shuffle in place via RNG
  - [ ] fan stack in hand ; spread stack on table
  - [ ] ripple/wave flip spread stack
  - [ ] destructive gimmicks like shred/tear/burn
  - [ ] creative gimmicks like annotate / draw / text / tally
  - [ ] artifact gimmicks like counters, tokens, dice

- basic interaction
  - [x] drag start picks N based on card-offset cursor Y value, within a 60% inner active band
    - ... drag progression can then adjust N, finalizing amount when drag exits source element
  - [x] drop on domain seems straight forward
  - [ ] drop on extant stack, probably presents interaction zones
    - top: stack over
    - main: riffle with by swiping?
    - main: cut into by dwell (to settle/cancel riffle) then release?
    - bottom: stack under
  - [ ] play with secondary buttons clicks while dragging
  - [~] main hand / off hand is ( the only? an? ) initial place?
  - ... mh is bound to mouse events ; first touch point
  - ... oh responds to second touch point ; maybe mouse events initiated by secondary button? modifier key?
  - [ ] display left/right hand, make them drop zones?
    - for mouse interaction, clicking a hand could select it as the mouse hand?
    - for touch, tapping a hand could toggle primacy?
  - [ ] how does drag start evolve when hand not empty?
    - hand starts empty
    - ... pickup 3 cards: hand now holds a 3-stack, oriented however was
    - ... pickup 2 cards: hand now holds a 2-stack and a 3-stack, rendered as a slight radial fan
    - ... pickup 1 card: hand now holds a car and a 5-stack, rendered as a slight 2-element fan ; the prior 2/3 fan was auto collapsed
    - i.e. force user to fan out hand if that's what they want, but auto collapse on subsequent pickup
  - [ ] basic click events
  - [ ] touch events ; pointer events

- maybe drag should mostly move all by default, require drag on edge/border to cut stack?

- improve drag pre-take feedback: an overlay and/or just start taking on
  mousedown, only finalizing take stack on first leave

## WIP

- acquire tarot asset set:
  - [x] alleged deck conversion
  - [x] use of external svg asset
  - [x] alleged quality check - g2g but for label placement
  - [ ] deck editing to fix alleged label placement
  - [ ] svg playing cards
  - [ ] colman-smith raster images
  - [ ] ascii-tarot
- toplevel api iteration
  - [ ] pass multiple decks
  - [ ] pass or spec more domains
  - [ ] show library
  - [ ] show books
  - [ ] action/drag to instantiate book

## Done

- got book viewer index navigation working

# 2025-03-28

- minor work on book viewer, didn't quite get getting loop working yet

# 2025-03-27

- fixed initial run of alleged tarot conversion
- support loading spec from external file
- reworked card book viewer to be continuous scroll
- limited controller event handling to only withing domain elements

# 2025-03-26

- added an alleged tarot conversion utility
- improved card book viewer
  - simplified and mad selection logic/ux more robust
  - decoupled internal card display from defined/id-entifed cards,
    a nod to a potential future card editor UI

# 2025-03-25

- simplified card data string to include orientation without JSON: `3#id` is 3 z-flips, `3,1#id` is a reversed face-up card
- converted alleged fool ; time mostly spent re-ramping up on how svg works
- built out card face rendering routine, just svg for now
- fixed event handling over child svg elements
- converted alleged magician ; added modal for card book browsing

# 2025-03-24

- got drag-to-cut and drop-to-stack working!
- also with a basic click to flip top card for now

# 2025-03-23

- continued developing drag start/enter/update logic
  - found out that drag data transfer cannot be updated during enter event
  - probably only valid during start event
- so need to lower back to mouse events after all
- got minimal stack cutting drag/drop operation working

# 2025-03-22

- mostly an offline day musing on where to go next
- post hoc wrote below notes from yesterday, then continued here
- realized may be able to create a card element immediately on drag start
  - use it to draw the drag image, same way the dropped stack/card will look
  - not sure if can get away with orphaned node, or if will need to be in-document, but invisible? display-none?
  - at any rate, should try to avoid bespoke canvas drawing, offscreen or otherwise
- realized that drag Y remapping has interesting next steps:
  - do a similar for click zones, drop zones, etc, which probably evolves to XY vec2 remapping
  - visualize with canvas-drawn overlay, starting on hover-dwell, evolving on `dragstart`
  - can also participate in touch events like `touchstart` / etc
  - the "dead" end zones may nicely afford corner or edge action zones, esp for hover/click interactions
    - might end up feeling like a card-natural analog of a pie menu
    - may adapt well to tap-for-actions modality

# 2025-03-21

- pivoted prototype mouse handling code to drag event handling;
  unsure how far this will work, but it seems promising:
  - `dragstart` picks up 1 or more cards
  - amount picked varies based on Y location the drag starts on card 
  - plan to vary amount being picked based on subsequent `dragover` events
  - plan to base `click` events to quickly pickup 1 / arbitrary N / all on same Y mapping
  - plan to add some kind of overlay to show these zones, at least during drag, maybe also in help screen, maybe just proactively on hover-dwell
- just got the drag behavior done, no dropping yet
- also plan to further elaborate the drag image for feedback on how much is being picked
- immediately moving card data from target element dataset to drag event data transfer is neat

# 2025-03-20

- started dev log, musing on (inter)action space

## Tarot Decks

Chased down some assets from <http://freeware.esoterica.free.fr/html/freecards.html>

### Alleged Tarot

<https://alleged.org.uk/pdc/tarot/svg.html>
<https://alleged.org.uk/pdc/tarot/about.html>

> Some while back I produced a minicomic called the Pebble Tarot,
> depicting the major arcana of the traditional Tarot deck in stick-figure form.
> In January 2002, I started a project to produce a new version of the stick-figure tarot,
> this time drawing them in colour and publishing them in SVG format.
> 
> I hope Tarot aficionados will not be too offended by my frivolous stick-figure interpretation.
> I figure that Tarot illustrations are supposed to be symbolic,
> and there’s nothing more symbolic than a stick figure.
> I have done a modicum of research this time around,
> and have included some of the symbolism from mediaeval and modern decks. 

### The SVG Deck

> Authors Jesse Fuchs and Tom Hart. For Windows and MacOSX.
> 
> 52 playing card deck with Jokers and 6 card backs. These card images were created form the SVG cards by David Bellot (free under the Creative Commons Licence).

### Nu-mam Deck

> Author V.H. Smith.
> 
> 52 playing card deck with 4 cardbacks. Size:106 x 169 pixels.
> An attractive richly coloured deck with images based on the Egyptian Mamluk suits of Coins, Polo Sticks, Cups and Scimitars/Swords. The suits have different coloured / textured backgrounds, the Diamonds have green velvet - see pic.
> 
> Licence:
> "These card images are distributed as freeware, meaning you can use and distribute the deck as you wish, provided that you do not charge anything for doing so. If you use these cards as part of a commercial product or for commercial purposes you must clearly state that they are non-commercial freeware and give credit to the artist/author. Modifications to the images are not allowed without prior written permisson of the author.". Licence is included with the download.

### Dood Deck

> Author: (C) Katzmiff Februray 2005.
> 52 card deck with cardback and two Jokers. Orginal card images which suggest divinatory meanings for the cards. Delicate / colour-coded designs. Note: The court cards are modified images from the Oxymoron deck. Size: 71 x 96 pixels.
> The file-names and card-sizes are correct for using with CardMage. Just add the four inverted (upside down) Aces and then give them their correct file-names before installing the deck.
> 
> Licence:
> This is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version. Licence included with download.

### Oxymoron Deck

> Author: Oxymoron......... Source code included.
> 
> Regular playing card deck. Includes Joker and cardback.
> Size: 73 x 97 pixels. Court cards are very well done monotones. Please visit website for more info.
> 
> Licence, GPL. Version 2, June 1991. These card Images can be modified under the terms of the licence which can be seen/read at the website.

### Dacha

> This deck will only work on an RISC operating system.
> 
> Author: Dacha
> Author info and Licence:-
> The deck "comprises all 52 cards along with black and red Jokers, and blue and red backs. All the cards have rounded corners and are 4-colour and 16-colour sprites.
> Size 59 by 79 pixels. Cards are free for any non-commercial use: just credit me with the design."
> NOTE: File download has no extension. (RISC = old British OS)

### Frog Tarot

### The DeadGirl (cool) Tarot.

<https://littledeadgirl0.tripod.com/freeprintabletarotcardsthebasicdeck/id9.html>

> Author/Artist: "littledeadgirl".
> 
> Free printable Tarot Cards. Full 78 card deck with alternate images for 14 cards.
> This original deck is a collage. The cards have a broad spectrum of images which cover; the unexpected, the everyday, the arresting, the 'cute', the appealing and the thought-provoking. A 'cool' deck.
> The cards are displayed with four to a picture and can be downloaded by right-clicking each 4-fold picture and choosing 'Save Image As...' from the mouse context menu. Card Size: 242 x 354pixels. Format: jpg.
> I have zipped them up for this download, but strongly recommend visiting the website for any further info and possible 'updates' to the deck. It would also be nice (mandatory in fact) to discover the artists real name & accord her due credit!
> 
> Licence: Free.
> 
> Author/artist comments:
> " I looked all over the Web for a cool-looking free printable deck of tarot cards and couldn't find a good one. So I made my own. It has taken me 2 years to finally complete all 78 cards...although I still don't consider the deck to be "finished". I hope you have as much fun using these as I did making them!" 

### Catharinas Tarot Trumps.

<http://catharinaweb.nl/>

> Author. Catharina
> 
> This tarot is a strangely beautiful fusion of assorted imagery which successfully incorporates both Native American and mythical images. The cards echo Pamela Smiths (Rider-Waite) depictions for the Major Arcana. They have a mystical, magical, quality and are set within wide shadowed golden frames.
> The website is in Dutch with some english, please visit if you wish to see her other work or to download the cards from there. (My favourites are The Sun & The World)
> Card size:250 x 350 pixels. Format: jpg.
> 
> The download contains the licence (in English) which is as follows,
> "These images are for non-commercial use only. You're not allowed to change them and make sure you give me credit."
> (Short & sweet licence - says it all.)

### The B.O.T.A Tarot deck

<http://www.tarotinstitute.com/free/bota/index.htm>

> Paul Foster Case. From The Tarot Institute.
> 
> Regarded by many to embody the Western Mystery Tradition, this is a black & white deck. The colouring of the images should be undertaken as an exercise in order to assimilate the depth of each card - one might say "a spiritual excerise".
> 
> Visit website for colouring info (important), & for viewing or downloading the cards individually.
> Card size: 244 x 220. ......NOTE: I believe it may only be Free for personal use.

### The Colman-Smith Tarot

<http://www.m31.de/colman-smith/index.html>

> Overview & Download Author Samvado Gunnar Kossatz
> 
> This is actually a reproduction of the Rider-Waite Tarot, but due to copyright issues concerning the words "Waite" and "Tarot", it has had to be been renamed.
> .
> The site is laid out similar to the Experimental Tarot above, with pages for veiwing the cards plus texts, and there are three downloads for the Tarot deck and Divinatory Texts etc, hence the download page will open in a separate window.
> Card size: 188 x 270 pixels. Format: jpg.
> 
> Many thanks to Mr Kossatz for making these card images available and licencing them under the GPL. (General Public Licence)
> 
> Alternatively; A monotone deck of the Colman-Smith Tarot (no cardback) with smaller sized cards can be downloaded from here.
> Licence, GPL. Card size:Approx. 112 x 176 pixels. Format: gifs
  	
### Inner World Tarot

> Author/Artist: Vince Cabrera
> 
> This Tarot deck ... "is a unique and inspired attempt to rework traditional Tarot imagery. Created from found images, original drawings, computer graphics and contributions from virtual and r/t friends around the world"
> 
> Full 78 card deck in a contemporary style with clear images and pleasing colours. Primarily intended for people to create/make their own physical deck. Size: 215 x 297 pixels
> 
> The download is free because all persons concerned ENJOYED creating the deck...... ...dbut they did'nt have time for dealing with publishing & distribution.
> 
> Much more info. plus an ongoing online divination/spread Manual (eventually to be another free download) at his Website. Thank you Vince - much appreciated.

<https://www.innerworldtarot.co.nz/about-this-deck/>
> The Inner World Tarot has been available as a free download since about 1997. It is a complete, 78 card deck with illustrated Minor and Major Arcana cards.
> 
> A good bit of the symbolism comes from Paul Foster Case's "Builders of the Adytum" deck, Crowley's Thoth deck and of course, the perennial Ryder Waite deck illustrated by Pamela Colman Smith. The titles on the cards come from the Thoth deck, and I don't know where I got the idea of adding the astrological information for each card. I'm pretty sure that the idea of referring to each card as "the Lord" of this that and the other comes from Eily Peach's "Tarot Workbook" and Case's book.
> 
> I came up with many original designs, however. The original idea was to have a deck made entirely of photographs, perhaps using Polaroids, but they proved impossibly fragile when it came to shuffling a few of them, let alone 78. I have no idea who many of the people in the photographs are. Some were friends who I met online, some were complete strangers that passed by wherever I was on the net and disappeared forever.
> 
> The deck was originally hosted on a free Tripod site (where you can still find it) but in the end there were way too many ads and popups and I didn't want to subject visitors to all that. So I moved everything to a free Geocities site and, now that Geocities is shutting down, I have finally decided to put the deck on its own dedicated website.
> 
> To be honest, I had almost forgotten about this deck (and the many gaps in the manual) until a few weeks ago when I received an email from somebody that wanted to download the deck for use in some sort of software. And seeing that people were still downloading the deck, I felt a bit ashamed at having been so lazy and have decided to finish the manual for once and for all.
> 
> The only other changes have been that the copyright notice on each card, which used to read "Riobravo Technologies Ltd" (which was an actual company) has been changed to "Vince Cabrera". The .BMP format which the cards originally came in has also been changed to .PNG for faster loading.

### The 1910 Deck

> (Source: Mystic Games website)
> 
> Full 78 card deck (Rider-Smith- Waite). The individual cards plus divinatory text can viewed/downloaded at the website. I've zipped the 78 cards for this download.
> 
> Size:150 x 262 pixels. Format: jpgs.
> 
> Illustrations of this deck are public domain.
