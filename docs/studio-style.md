# Studio style

**Draft, 2026-11-16.** Written by Fable 5.2 at Venkat Rao's request for him to edit.
Each entry describes something the Studio does today as far as the protocol text and
the decision record say; **each is to be checked against the code before this page is
linked from anywhere.**

This page describes how the Studio's pages behave and why. It is one style. It is not
a specification, it asks nothing of any other software, and a client that does every
one of these things differently conforms to the protocol exactly as well.

It is written down so that nobody has to work the style out from the Studio's
behaviour, and so that anyone who likes a choice can take it, and anyone who does not
can see what they are declining.

## Where style ends

The protocol governs what a blyg serves: its documents and its feed. That is tested,
and it is not style. Two things follow that this page takes as fixed:

- Nothing described here puts anything into a document or a feed.
- The Studio never reads another blyg's pages as data. Pages are for people.

Everything else below is a choice.

## What the choices are for

The Studio's style follows four ideas, and each entry says which it serves.

- **A soapbox, not a scoreboard.** A blyg is a place to say things in public. The
  Studio shows what was said and who said it, and avoids turning attention into a
  number to compete on.
- **Claims look like claims.** Most of what one blyg says about itself or another
  cannot be checked. The Studio shows a checked thing differently from an unchecked
  one.
- **The author decides what is public.** Reading, responses received and reading lists
  are private until the owner chooses to show them.
- **Boring on purpose.** The Studio is a reference. Where a plain choice and a clever
  one both work, it takes the plain one, and leaves the clever one to mods and to
  other clients.

## The choices

Each entry: what the Studio does, what that serves, what it costs, and another way a
client could reasonably go.

### Counts

**Responses are counted only where they are shown.** When an owner has switched on the
responses list for an item, the page says how many responses it is showing. With the
list off, or with none to show, it says nothing.
*Serves:* a soapbox, not a scoreboard; the author decides. *Costs:* a visitor cannot
tell a post nobody answered from one whose owner keeps responses private. *Another
way:* a presence marker with no number, or no indication at all.

**The count is words on the page and nothing else.** No attribute, microformat or
structured-data block carries it.
*Serves:* a soapbox, not a scoreboard. Most blygs run the Studio, so anything its
pages expose to software would become a field other software sorts by. *Costs:*
tools that want the number must count the list. *Another way:* publish it as
structured data and accept what gets built on it.

**Nothing public is ranked.** No "most discussed", no "popular", no totals for a blyg,
no tally beside a person's name.
*Serves:* a soapbox, not a scoreboard. *Costs:* a visitor gets no help finding what
others found worth answering, beyond the home page's own order. *Another way:* a
client built for discovery would rank, and say how.

### Responses

**A response list is a list of citations.** Each entry says who responded, from which
blyg, and links to their item on their own blyg. The response's text stays there.
*Serves:* a soapbox, not a scoreboard. Nobody's words appear on a page they do not
control. *Costs:* reading a conversation means following links. *Another way:* fetch
and show the text, as a comments section does (technical note 7 describes one way).

**Off by default, per item, and any entry can be hidden.** Hiding is reversible and
deletes nothing.
*Serves:* the author decides. *Costs:* a new owner sees no responses on their pages
until they turn the list on. *Another way:* on by default, with moderation.

**Links and reposts are kept apart from responses.** Someone who only linked to an
item, or quoted it with nothing of their own to say, is shown as having done that.
*Serves:* claims look like claims. *Costs:* a second, quieter list to look at.

### What can and cannot be checked

**Verified and claimed look different.** A response the Studio verified against the
responder's own document is marked as verified. A byline, a date, a citation label or
a "machine-written" mark is shown as the publisher's word.
*Serves:* claims look like claims. *Costs:* more visual states than a page that treats
everything alike.

**A quote of another blyg is shown as this blyg's copy.** It carries the version it
was taken from and a link to the source, and is not presented as the source's current
words.
*Serves:* claims look like claims.

**Machine-written text is unmarked unless the owner turns marking on,** and where it
is marked, the page says the disclosure is the publisher's own and unverified.
*Serves:* claims look like claims. A tint that looked like a verification badge would
claim more than anyone knows. *Costs:* by default a visitor is not shown which
passages were generated, though the document says so to any software that asks.
*Another way:* always mark.

### Time and order

**An item sorts no newer than when the Studio first saw it.** In the owner's reading
view, another blyg's stated time is trusted only up to the moment of first sight.
*Serves:* claims look like claims. A blyg cannot push itself to the top by dating its
posts in the future. *Costs:* a post read late sorts late.

**The home page keeps what still matters near the top.** The default order lets items
sink as new ones arrive, more slowly the more they have been pinned, and lifts an
item a place when it is revised. It is described in full, with fixtures, as RFC-3.
*Serves:* boring on purpose, oddly: it replaces a "pinned post" setting with what the
author already did. *Costs:* it is less familiar than newest-first. *Another way:*
newest-first, which the Studio also offers.

**Things published together are shown together.** A thread and the fragments it was
published with fold under the thread in the reading view. Routine republishing with
no new words is queued quietly.
*Serves:* a soapbox, not a scoreboard: volume does not buy position. *Costs:* a
fragment published in a burst is one tap further away.

### Versions

**A page shows the live version and the pinned ones.** Pinned versions are shown as
separate frozen copies, each marked as such and each with its own address. Nothing
suggests that the versions in between can be seen, because they cannot.
*Serves:* the author decides. *Costs:* no edit history view, even for an author who
would like to offer one. *Another way:* an author who wants history public pins more
often.

**Version numbers are bare.** No "major" or "minor", no edition names. The page shows
the number and the author's note.
*Serves:* boring on purpose. What matters is shown by pinning, which costs the author
a promise.

### Addresses and limits

**Conventions the Studio chose,** none of which the protocol asks for: a blyg at
`/blyg/`; fragments at `f/{id}/`, threads at `t/{id}/`, public hoppers at
`h/{slug}/`; a fragment limit of 1,000 characters where the protocol suggests 2,000;
feed titles made from the change note and an excerpt; `$…$` for mathematics.
*Serves:* boring on purpose. *Another way:* any.

### Voice

**The Studio's own pages speak for the ecosystem and not for a camp.** No "we" and
"they", no insiders and outsiders.
*Serves:* a soapbox, not a scoreboard.

## Changing any of this

An owner can change most of it with a theme or a mod ([`mods.md`](mods.md)), and the
Studio's defaults are only defaults. What a mod cannot do is put any of it into a
document or a feed; that line is the protocol's, not this page's.
