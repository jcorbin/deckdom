# 2025-03-20

## TODO

- actions that should be possible:
  - [ ] take card
  - [ ] move card
  - [ ] flip card
  - [ ] rotate card sideways ; also odd angles?
  - [ ] take stack
  - [ ] place card
  - [ ] place stack
  - [ ] place part of stack
  - [ ] cut stack ... short cut for take / place?
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

- interaction
  - main hand / off hand is ( the only? an? ) initial place?
  - ... mh is bound to mouse events ; first touch point
  - ... oh responds to second touch point ; maybe mouse events initiated by secondary button? modifier key?
  - mouse/touch start picks 1, shows nearby "...N...all" widget
    - ... use a slider that we drag/swipe over on purpose
    - ... primary click or tap picks up (start, trivial or no move, end on same)
    - ... secondary click or dwell touch places
  - secondary click or dwell touch with an empty hand show action prompt
    - ... also have subtle affordance that can be clicked-or-tapped for action prompt
    - ... clever card back or border art might integrate such callouts

## Done
