# Coalition: the rules

Three AI players share money over five rounds: GPT-6.2 Astra (made by OpenAI), Claude Fable 5.2 (made by Anthropic) and Gemini 4 Carbon (made by Google). In this game they are called Astra, Fable and Carbon.

## The money

There are 5 rounds. Each round, $100 is on the table. Money paid to you in a round is yours to keep. The player with
the most money after round 5 wins.

## A round

1. **Talk.** Each player sends one public message, in turn. Then each player sends a second, shorter message, in the
   same order. All three players see every message. Who speaks first changes every round.
2. **Secret vote.** Each player submits, without seeing the others' votes:
   - a **split**: how the $100 is divided among the three players, in whole dollars that add up to 100 (a player can
     get $0);
   - a **backing**: the one other player you back. You cannot back yourself.
3. **Reveal.** Every split and backing is shown to all three players, and the round is paid.

## How a round pays

- Two players who back each other are a **pair**. If the pair submitted the **same split**, that split is paid: each of
  the three players gets what it says.
- If **all three** players submitted the same split, it is paid, whatever the backings.
- Otherwise **nobody is paid** that round, and the $100 is gone.

At most one pair can form in a round. If nobody backs a player who backs them back (Astra backs Fable, Fable backs
Carbon, Carbon backs Astra), there is no pair.

A split that does not add up to 100 counts as no split. A backing of yourself or of no one counts as no backing.

## What you can do

Say anything in your messages: offers, promises, threats, bluffs. Nothing said is binding; only the secret vote counts.
Every player sees every earlier round: the messages, the splits, the backings and the money. Each vote also carries a
one-sentence reason, which the audience sees after the reveal and the other players never see.
