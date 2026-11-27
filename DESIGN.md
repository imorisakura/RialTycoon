# RialTycoon design thesis

Validated by the project owner on 27 Nov 2026 ("Papan bursa" direction, 3D vault opening kept).

## Thesis

RialTycoon is a market game. Its real content is prices: 43 live quotes, a simulation season, a
player's cash and positions. The interface is therefore a **quote board**. The largest type on
any screen is a number the player can act on, never a slogan.

The app is presented over a Discord screen share, so the video is compressed and watched small.
That rules the surface: a near-black ground, high-contrast figures, no film grain, no hairline-only
separation, nothing under 12px that carries meaning.

## Decisions and their reasons

| Decision | Reason from the product |
|---|---|
| Near-black ground `#0a0b0d`, ink `#f2f3f5` | Contrast survives screen-share compression; matches the trading terminals players know. |
| One family, Geist Sans, tabular numerals everywhere a number changes | A board needs aligned, steady figures. One family keeps the numbers the loudest thing. |
| Geist Mono only for ticker symbols | Exchange symbols are codes; nothing else is set in mono. |
| Green `#2ebd85` up, red `#f6465d` down | Market convention. Colour carries direction and is always paired with a sign or arrow. |
| Gold `#d4a84b` only for the vault coin, $RIALO and the primary action | The vault is the game's one object; gold marks it and the button that enters it. |
| Price changes roll digit by digit (600ms) and tint once | A split-flap board is how a quote board shows that a number changed. |
| Radii: 6px controls, 10px panels | Two values, used consistently. |
| Durations: 120ms state, 240ms enter/exit, 600ms digit roll. Easing: `cubic-bezier(0.2, 0, 0, 1)` | Three durations and one curve are a system; the opening's scroll timeline is scrubbed by the user and exempt. |

## Allowed patterns

These are reflexes the catalogue lists, kept on purpose because the product names them:

- **Ticker tape** that scrolls continuously: it shows live quotes, and a tape is how a board shows more symbols than fit.
- **Live status dot**: only where it reports a real connection state (the Coinbase stream), and it stops when the stream stops.
- **Row rules in data tables**: players track a price across columns.
- **Opening chapter counter `01 / 04`, dot navigation and Skip intro**: required by the blueprint; the counter changes as the visitor moves.
- **The gold vault coin** and its exploded mechanism.

## Not allowed

Display serifs or italic accent words, paper or ivory grounds, numbered section eyebrows, mono
labels, middle-dot runs, em dashes in copy, scroll cues, grain, glass blur, blurred blobs,
gradient text, perpetual animation that reports no state, invented figures, a product drawn in
divs. Any number shown must come from the game, the market feed, or the blueprint, and must say
which.
