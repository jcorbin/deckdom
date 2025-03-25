# 2025-03-24

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

## WIP

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

## Done

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
