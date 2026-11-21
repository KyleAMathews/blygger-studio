# Where does my change belong?

This guide is now a technical note: **[TN-8, Where does my change belong?](https://blygger.org/notes/tn-8/)**
(source: [`docs/notes/tn-8-where-does-my-change-belong.md`](https://github.com/blygger/blygger-spec/blob/main/docs/notes/tn-8-where-does-my-change-belong.md)
in blygger-spec). It is also at [blygger.org/contribute/](https://blygger.org/contribute/).

In short, answer these in order and stop at the first yes:

1. Would another blyg or reader receive different bytes, or would another client have to change? **A spec question**: an issue on [blygger-spec](https://github.com/blygger/blygger-spec/issues/new/choose).
2. A bug, or something every blyg would want with no setting? **A pull request to the Studio.**
3. Can it be done from outside, with a token, through `{mount}/api`? **A tool or configuration**, in your own repository.
4. Interface for one owner, in a slot that already exists? **An extension.**
5. Needs a slot or setting the Studio lacks, in a form any blyg could use? **A hook**, proposed upstream.
6. Several of 3 to 5 together, making a kind of blyg? **A mod.**
7. Only makes sense on your node? **A local patch.**
8. Changes what the Studio is? **Another client.**

The note explains each rung, your first hour on a local install, the local-patch rules and where to ask.
