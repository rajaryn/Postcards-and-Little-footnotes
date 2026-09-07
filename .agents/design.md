# Postcards & Little Footnotes

## Product & Design Specification

---

# 1. Product

**Postcards & Little Footnotes** is a personal trip memory application.

It is a place to collect the small things that happened while travelling.

A photograph.

A sentence.

A strange little observation.

A place worth remembering.

A moment that would otherwise disappear.

The application is deliberately not designed as a social network, photo-management system, travel planner, or productivity tool.

It should feel closer to opening a box of things collected during a trip than opening an application.

The central interaction remains:

```text
Something happened
        ↓
Capture it
        ↓
Keep moving
```

The application handles chronology and organization automatically.

The user should feel like they are **leaving things behind for their future self**, not maintaining a digital archive.

---

# 2. Product Name

## Postcards & Little Footnotes

The name describes the two fundamental forms of memory in the product.

### Postcards

The visual memories.

Photographs captured during a journey.

### Little Footnotes

The small human details attached to those memories.

A sentence.

A thought.

A joke.

A detail nobody else would remember.

The two concepts should be visible in the product itself.

They are not merely branding.

A photograph should behave like a postcard.

A piece of writing should behave like a footnote.

Together they form the visual language of the application.

---

# 3. Core Mental Model

The data model is:

```text
Trip
 └── Day
      └── Moment
```

Only **Trip** and **Moment** are actual entities.

Days are generated visual groupings based on timestamps.

A Moment can contain:

```text
Photo + Footnote
Photo only
Footnote only
```

A Moment never requires both.

The interface should reflect this simplicity.

The user should never be asked to classify a moment.

---

# 4. Design Thesis

The application should feel like:

> **a box of memories from a trip that happens to be digital.**

Not:

> a travel app with a scrapbook theme.

This distinction is fundamental.

The design should not take conventional application components and decorate them with paper textures and stamps.

Instead, the **memory itself should become the interface**.

Photographs become physical-looking prints.

Writing becomes marginalia.

Dates become printed details.

Trips become collections.

Days become natural pauses in the story.

The interface should feel assembled rather than generated.

---

# 5. The Emotional Goal

The application should evoke:

* nostalgia
* intimacy
* discovery
* warmth
* quietness
* curiosity
* imperfection
* personal history
* the feeling of finding something you had forgotten about

It should feel good to scroll through even when nothing is happening.

The user should occasionally think:

> I forgot about this.

That is a successful interaction.

---

# 6. What It Should NOT Feel Like

Do not design it as:

* a dashboard
* a productivity application
* a social media feed
* a photo gallery
* a cloud storage interface
* a travel booking application
* an AI journal
* an AI-generated memory product
* a generic mobile SaaS application
* a template marketplace design
* a scrapbook template
* a Pinterest clone
* a glassmorphism application
* a card-heavy design system

Avoid:

* excessive rounded rectangles
* gradient backgrounds
* glowing surfaces
* floating glass panels
* excessive shadows
* badges
* pills
* generic iconography
* AI sparkle motifs
* oversized navigation
* symmetrical grids
* identical cards
* repetitive component structures
* decorative animation
* excessive illustrations

The product should have personality without becoming cute.

It should have character without becoming theatrical.

---

# 7. Visual Concept: The Digital Travel Desk

The primary visual metaphor is not a scrapbook.

It is a **travel desk**.

Imagine returning from a trip and emptying your pockets onto a table.

There are photographs.

Little notes.

Receipts.

Tickets.

Dates.

Names of places.

A folded piece of paper.

A sentence written at 2 AM.

Things don't line up perfectly.

Some things are important.

Some things are tiny.

Some things are barely explained.

That feeling should inform the interface.

The screen is the table.

The moments are the things left on it.

---

# 8. Composition Over Components

The most important visual rule:

> **Do not make every moment look like the same component.**

A timeline should not become:

```text
Card
Card
Card
Card
Card
```

Instead, it should feel like a sequence of compositions.

For example:

```text
                    DAY 1

             SEPTEMBER 7, 2026


       ┌──────────────────────────┐
       │                          │
       │                          │
       │        PHOTO             │
       │                          │
       │                          │
       └──────────────────────────┘

                  10:42 AM

       finally reached after
       six hours of driving.


                         ·


               12:18 PM

       ┌───────────────┐
       │               │
       │     PHOTO     │
       │               │
       └───────────────┘

       tiny chai shop.
       best chai of the trip.


                            ┌─────┐
                            │  03 │
                            │     │
                            └─────┘

                         little footnote
```

The exact composition can change.

The visual rhythm should not.

---

# 9. The Two Fundamental Objects

## 9.1 Postcard

A postcard is a photograph presented as a physical memory.

It should not literally look like a postcard.

Do not add postcard borders to every photograph.

Instead use subtle physical cues:

* breathing room
* photographic framing
* natural image crops
* slightly varied placement
* paper-colored surroundings
* restrained metadata
* occasional printed details
* occasional small offset
* physical-feeling proportions

A photograph should remain a photograph first.

The postcard reference should be something the user **feels**, not something they immediately identify as a design gimmick.

---

## 9.2 Footnote

A footnote is a piece of writing attached to a memory.

It should not look like a caption field.

It should not sit inside a rounded input-shaped container.

It should feel like something someone wrote down because they didn't want to forget it.

Example:

```text
10:42 AM

Finally reached.

                     — six hours later
```

Or:

```text
12:18 PM


There was this tiny chai shop
we almost walked past.


                   02
```

Or simply:

```text
Nobody wanted to go out.

So we ordered everything.
```

Footnotes should have more freedom than conventional captions.

---

# 10. Material Language

The visual world should borrow from physical travel objects without becoming literal skeuomorphism.

References include:

* warm paper
* photographic prints
* notebooks
* postcards
* envelopes
* printed dates
* marginal notes
* ticket stubs
* receipt typography
* faded ink
* imperfect alignment
* paper edges
* subtle grain

These are references, not UI components.

Do not create fake physical objects everywhere.

The goal is:

```text
digital interface
        +
physical memory
        =
something intimate
```

Not:

```text
digital interface
        +
fake paper textures everywhere
        =
scrapbook simulator
```

---

# 11. Color

The base environment should feel like warm paper rather than a white application canvas.

Use a restrained palette.

Primary surfaces should live around:

* warm ivory
* paper
* faded cream
* soft beige
* muted ink
* warm charcoal

Photography provides most of the color.

The interface should therefore avoid competing with photographs.

Accent colors should be rare.

Possible accents may come from:

* faded postal red
* muted blue ink
* washed green
* old ochre
* dusty terracotta

Never use gradients as the primary visual identity.

Never make every surface colorful.

The photographs should remain the strongest visual elements.

---

# 12. Typography

Typography should create the feeling of printed material.

Use a highly readable primary typeface.

Pair it with a secondary type treatment for footnotes and editorial details.

The secondary typeface can be:

* serif
* handwritten-inspired
* editorial
* typewriter-inspired

But it must remain readable.

Avoid decorative handwriting fonts.

Avoid fonts that make the product look childish.

Typography should establish hierarchy through:

* scale
* weight
* spacing
* alignment
* placement

Not through excessive UI labels.

---

# 13. Typography Hierarchy

The hierarchy should generally be:

```text
Trip name
      ↓
Day
      ↓
Moment
      ↓
Time
      ↓
Footnote
      ↓
Secondary metadata
```

However, this hierarchy should not always be visually rigid.

A tiny handwritten observation can sometimes carry more visual personality than a date.

A photograph can dominate the entire screen.

A footnote can occasionally become the primary content.

The system should allow memories to breathe.

---

# 14. Trips Screen

The Trips screen should feel like opening the first page of a personal travel archive.

Do not use a standard grid of identical cards.

Avoid:

```text
┌──────────┐ ┌──────────┐
│ Trip     │ │ Trip     │
│ image    │ │ image    │
│ metadata │ │ metadata │
└──────────┘ └──────────┘
```

Instead, create a loose collection.

Example:

```text
POSTCARDS
& LITTLE
FOOTNOTES


Himachal
September 2026

23 moments


                         Goa
                         May 2026

                         41 moments


           + start a new trip
```

Trip entries can have subtle variations in placement and scale.

The most recent or active trip should naturally attract attention.

Do not make it look like a dashboard.

---

# 15. Trip Entry

A trip should contain very little information.

Primary:

```text
Trip name
```

Secondary:

```text
Date range
Moment count
```

Optional visual preview:

```text
one photograph
```

Do not create:

* destination badges
* category labels
* progress indicators
* statistics
* activity charts
* AI summaries
* travel metrics

A trip is a memory collection, not a report.

---

# 16. Create Trip

Creating a trip should feel like writing a name on the outside of an envelope.

Required:

```text
Trip name
```

Optional:

```text
Start date
End date
```

Example:

```text
new trip


what are we calling this one?

[ Himachal ]



when?

07 Sep  —  10 Sep


                begin
```

No cover image should be required.

No destination should be required.

No description should be required.

No setup wizard.

No categories.

The user should be inside the trip within seconds.

---

# 17. Trip Timeline

The timeline is the heart of the product.

It should feel like **a journey unfolding vertically**.

Not a feed.

Not a gallery.

Not a database.

The timeline should have significant negative space.

Example:

```text
← Himachal


SEPTEMBER 7–10
2026


DAY ONE

September 7


10:42 AM


        ┌──────────────────────┐
        │                      │
        │       PHOTO          │
        │                      │
        └──────────────────────┘


Finally reached.

Six hours later than planned.


                         ·


12:18 PM


                 ┌─────────────┐
                 │             │
                 │    PHOTO    │
                 │             │
                 └─────────────┘


There was this tiny chai shop
we almost walked past.


                         ·


3:47 PM


        ┌────────────────────────┐
        │                        │
        │         PHOTO          │
        │                        │
        └────────────────────────┘
```

The exact positions should vary.

---

# 18. Day Separators

Days should feel like turning a page.

Do not put every day inside a container.

Instead use typography and whitespace.

Example:

```text
────────────────────────────


DAY TWO

September 8


────────────────────────────
```

The divider can be extremely subtle.

The whitespace does most of the work.

Days are visual chapters, not UI sections.

---

# 19. Moment Composition

There should be multiple valid compositions.

## Photo + Footnote

```text
             10:42 AM


       ┌─────────────────────┐
       │                     │
       │       PHOTO         │
       │                     │
       └─────────────────────┘


Finally reached.

The road was worth it.
```

## Photo Only

```text
             3:47 PM


       ┌─────────────────────┐
       │                     │
       │                     │
       │       PHOTO         │
       │                     │
       │                     │
       └─────────────────────┘
```

## Footnote Only

```text
             8:32 PM


Nobody wanted to go out.

So we ordered everything.
```

The third type should not look incomplete.

A text-only moment is a complete memory.

---

# 20. Deliberate Imperfection

The interface should not be perfectly symmetrical.

Small variations are encouraged.

Examples:

* photograph slightly offset
* footnote slightly indented
* different image widths
* varying whitespace
* occasional alignment changes
* small editorial marks
* irregular but controlled positioning

However:

> **Randomness must never reduce usability.**

The imperfection should feel authored.

Not broken.

Not messy.

Not decorative chaos.

Think:

```text
intentional imperfection
```

not:

```text
random placement
```

---

# 21. Responsive Composition

On mobile, the composition should remain intimate.

Do not simply shrink the desktop version.

Mobile should prioritize:

1. photograph
2. footnote
3. time
4. navigation

Large margins should remain where possible.

Photographs should be allowed to become wide and immersive.

On larger screens, the timeline can become more spatial.

For example:

```text
             DAY ONE


      photo                 note
      photo
      photo


                           12:18 PM

                    tiny chai shop.


             another photograph
```

Desktop should feel like a larger table, not a stretched mobile feed.

---

# 22. Capture

Capture is the most important action.

It must remain extremely fast.

The interaction should feel like:

```text
I want to remember this.
        ↓
Capture
        ↓
Done
```

The interface should not make the user feel like they are filling out a form.

---

# 23. Capture Interface

Avoid a large conventional modal.

The capture surface should feel closer to opening a blank piece of paper.

Example:

```text
capture something


        [ take a photo ]

        [ choose a photo ]


what happened?


Finally reached after six hours
of driving.


                         add
```

The writing field should not visually resemble a form control.

It should feel like an empty space waiting for a thought.

---

# 24. Capture Rules

Photo is optional.

Footnote is optional.

At least one must exist.

Do not ask for:

* title
* category
* location
* tags
* mood
* people
* destination
* rating
* description

Timestamp is automatic.

Location is not manually requested in MVP.

The user captures the moment and moves on.

---

# 25. Capture Button

The capture action should always be accessible.

However, it should not dominate the interface.

Instead of a large floating action button reading:

```text
+ Capture
```

consider a quieter interaction:

```text
+ capture
```

or:

```text
add a moment
```

The control should feel like part of the notebook rather than a SaaS action button.

It can become more visually prominent during moments when the user is actively exploring a trip.

---

# 26. Microinteractions

Animation should be almost invisible.

The interface should feel alive through composition, not motion.

Use:

* gentle transitions
* image fade-ins
* subtle movement when placing a new memory
* small button feedback
* smooth scrolling
* natural image loading

Avoid:

* bouncing
* floating elements
* parallax
* animated gradients
* shimmer
* excessive spring animations
* confetti
* AI-style loading effects

A newly captured postcard might settle into the timeline with a tiny positional transition.

That is enough.

---

# 27. Adding a Moment

After posting:

```text
capture
   ↓
upload
   ↓
moment created
   ↓
moment quietly appears in timeline
```

Do not send the user through a success screen.

Do not display:

```text
✓ Moment created successfully!
```

Instead, let the memory appear.

The result itself should provide confirmation.

---

# 28. Image Upload

Photos remain private.

The intended technical flow is:

```text
Choose / take photo
        ↓
Upload directly to Cloudflare R2
        ↓
Create moment
        ↓
Show moment in timeline
```

The upload should not expose storage credentials.

Images should be displayed through short-lived URLs generated by the backend.

The user should see simple progress feedback.

Technical details should remain invisible.

---

# 29. Upload Failure

Failures should be human and actionable.

Avoid:

```text
R2 PUT operation failed.
```

Prefer:

```text
Couldn't save that photo.

Try again.
```

Or:

```text
That didn't quite make it.

Try again
```

The user should never need to understand the storage architecture.

---

# 30. Navigation

Navigation should be minimal.

Primary structure:

```text
Trips
  ↓
Trip
  ↓
Moments
```

Capture is an action available from the trip.

Do not introduce navigation for features that do not yet exist.

Possible mobile structure:

```text
────────────────────────────

        Trips       + add

────────────────────────────
```

But navigation should remain visually quiet.

The memories should occupy most of the interface.

---

# 31. Trip Header

The trip header should not behave like a standard app bar.

Avoid:

```text
← HIMACHAL       ⋮
September 7–10
```

Instead:

```text
←


Himachal

September 7–10
```

The title should have space around it.

Actions can remain small and contextual.

---

# 32. Metadata

Metadata exists to support memory, not to become content.

The application may collect:

* timestamp
* location
* image dimensions
* R2 object key

Metadata should remain invisible unless it contributes to the memory.

Do not turn metadata into dashboard information.

Avoid:

```text
10:42 AM
28°C
3.4 km walked
2,431 steps
GPS 32.24...
```

Instead:

```text
10:42 AM
```

Perhaps:

```text
Manali
10:42 AM
```

when location is meaningful.

---

# 33. Location

Location should never become a primary interaction.

Do not ask:

```text
Where are you?
```

during capture.

If automatic location is eventually implemented, it should quietly enrich the memory.

Location should feel like something the application discovered later, not something the user had to enter.

---

# 34. Empty Trips

An empty trip should feel like an untouched page.

Example:

```text
Himachal

September 7–10


This trip is just getting started.


              + add a moment
```

Do not use illustrations.

Do not use stock graphics.

Do not make the empty state promotional.

The emptiness itself should feel intentional.

---

# 35. No Trips

The first screen should feel inviting rather than empty.

Example:

```text
Postcards
&
Little Footnotes


Nothing here yet.


Start with somewhere
you've been.


             + new trip
```

Keep the language quiet.

Do not use onboarding copy such as:

```text
Welcome to your AI-powered
travel memory experience!
```

---

# 36. Interaction With Existing Moments

Moments should support simple actions:

* edit footnote
* replace photo
* delete moment

These actions should remain contextual.

Do not put three visible action buttons beneath every memory.

For example, long press or a small contextual menu can reveal them.

The default state should remain visually clean.

---

# 37. Editing a Footnote

Editing should preserve the feeling of writing.

Instead of:

```text
EDIT MOMENT

Caption
[_____________________]

Cancel       Save
```

use:

```text
10:42 AM


Finally reached after six hours
of driving.


        edit
```

Entering edit mode should feel like changing the note itself.

The visual transition should be subtle.

---

# 38. Delete

Deleting should be simple.

Do not require multiple confirmation dialogs for ordinary actions.

For destructive actions where confirmation is genuinely necessary:

```text
Forget this moment?

This can't be undone.


forget it        keep it
```

Language can be human.

But never make destructive actions ambiguous.

---

# 39. Accessibility

The tactile visual language must never compromise accessibility.

Maintain:

* strong text contrast
* readable font sizes
* sufficient tap targets
* keyboard accessibility
* screen reader labels
* reduced-motion support
* visible focus states
* understandable error messages

Imperfection is visual.

Accessibility is not optional.

---

# 40. Desktop

Desktop should feel like opening the travel box on a larger table.

Do not fill the entire screen with UI.

A centered reading column can coexist with empty space.

Example:

```text
                         Postcards
                         & Little Footnotes


                  Himachal
                  September 7–10


             ┌──────────────────────┐
             │                      │
             │        PHOTO         │
             │                      │
             └──────────────────────┘

                    10:42 AM

             Finally reached.
```

The empty space is intentional.

Do not add sidebars simply because desktop has room.

---

# 41. Mobile

Mobile is the primary environment.

The user will often be:

* walking
* sitting in a car
* standing somewhere
* waiting
* travelling
* tired
* distracted

Capture must therefore be extremely fast.

The timeline should require almost no interpretation.

A user should be able to open the application and understand what to do immediately.

---

# 42. Motion Philosophy

Motion should represent physical behavior.

Good:

```text
new photograph
      ↓
settles gently into place
```

Good:

```text
page transition
      ↓
feels like turning a page
```

Bad:

```text
button
      ↓
bounces three times
```

Bad:

```text
loading
      ↓
AI shimmer
```

Motion should reinforce the physical metaphor.

It should never advertise itself.

---

# 43. Visual Rhythm

The timeline should deliberately alternate between:

```text
photograph
space
footnote
space
photograph
small detail
space
photograph
```

rather than:

```text
photo
caption
photo
caption
photo
caption
```

Some moments should be visually dominant.

Others should almost disappear.

That contrast is what makes the timeline feel like memory.

---

# 44. Image Treatment

Photography should be treated carefully.

Do not apply a universal filter.

Do not automatically tint photographs.

Do not place decorative frames around every image.

Use:

* natural cropping
* generous margins
* occasional physical-looking framing
* restrained radius or no radius depending on composition
* high-quality rendering

Photographs should retain their original character.

The application should frame memories, not beautify them artificially.

---

# 45. Postcard Variations

A postcard can appear as:

### Large print

```text
┌────────────────────────────┐
│                            │
│          PHOTO             │
│                            │
└────────────────────────────┘
```

### Small print

```text
       ┌───────────────┐
       │               │
       │     PHOTO     │
       │               │
       └───────────────┘
```

### Offset print

```text
             ┌────────────────┐
             │                │
             │     PHOTO      │
             │                │
             └────────────────┘
```

### Paired prints

```text
┌──────────────┐     ┌──────────────┐
│              │     │              │
│    PHOTO     │     │    PHOTO     │
│              │     │              │
└──────────────┘     └──────────────┘
```

The system should choose compositions intentionally rather than randomly.

---

# 46. Footnote Variations

Footnotes can appear:

### Beneath a photograph

```text
PHOTO

10:42 AM

Finally reached.
```

### Beside a photograph

```text
PHOTO              finally reached.

                   six hours later.
```

### In the margin

```text
PHOTO


                         01
                         We almost
                         missed this.
```

### Alone

```text
8:32 PM


Nobody wanted to go out.

So we ordered everything.
```

The text should never look like a social caption.

---

# 47. Small Editorial Details

Small details can create personality.

Examples:

```text
01
02
03
```

or:

```text
September 7
```

or:

```text
10:42 AM
```

or:

```text
from the road
```

or:

```text
a little footnote
```

Use these sparingly.

The interface should reward attention.

A user should notice something new after spending time with it.

---

# 48. Imperfect Details

Occasional imperfections are welcome:

* slightly different alignment
* subtle rotation of a print
* tiny offset
* imperfect spacing
* quiet annotation
* asymmetrical composition

But these must be generated from a controlled visual system.

Do not randomly rotate every card.

Do not make every element look handwritten.

Do not make the interface messy.

The feeling should be:

> someone arranged these memories.

Not:

> CSS is malfunctioning.

---

# 49. Brand Presence

The product name should appear naturally.

It should not become a giant logo on every screen.

The name can appear as:

```text
Postcards
&
Little Footnotes
```

with typography that feels closer to a title on the inside cover of a notebook.

The brand should become recognizable through the entire visual language rather than a logo alone.

---

# 50. Sound

Sound is not required for MVP.

If sound is ever introduced, it should be extremely subtle.

Avoid notification-like sounds.

Avoid gamification sounds.

The application should remain quiet.

---

# 51. PWA

The application remains a mobile-first Progressive Web App.

Installation should feel native but not intrusive.

The app shell should support fast loading.

The visual identity should continue into:

* app icon
* splash screen
* browser metadata
* installed application appearance

The app icon should reference the product's visual language without becoming a literal postcard illustration.

---

# 52. Performance

The emotional experience depends on immediacy.

Prioritize:

* fast first render
* responsive capture
* optimized image loading
* progressive image rendering
* optimistic UI where safe
* clear upload states

A beautiful interface that takes several seconds to appear defeats the product.

---

# 53. Core UX Rule

Whenever a feature makes capturing a moment slower, question whether it belongs.

The user should never think:

> I need to organize this.

They should think:

> I want to remember this.

Then:

```text
capture
```

Everything else comes later.

---

# 54. MVP Scope

MVP includes:

### Trips

* view trips
* create trip
* open trip
* view chronological moments

### Moments

* photo + footnote
* photo only
* footnote only
* automatic timestamp
* edit
* delete

### Capture

* take photo
* choose photo
* write footnote
* submit moment

### Storage

* private Cloudflare R2 storage
* direct browser uploads
* backend-generated short-lived image URLs

### PWA

* installable application
* app shell caching

---

# 55. Explicitly Out of MVP

Do not add:

* social profiles
* likes
* comments
* followers
* public trips
* AI-generated captions
* AI summaries
* AI trip descriptions
* automatic storytelling
* gamification
* badges
* streaks
* travel statistics
* complex maps
* route planning
* destination recommendations
* weather dashboards
* extensive metadata forms

The product should remain small.

---

# 56. Future Features

Future features should extend the memory metaphor.

## Map

A secondary way to explore memories.

```text
Timeline | Map
```

The map should never replace the timeline.

---

## Trip Recap

A visual reconstruction of a completed trip.

It should feel like looking through the collected material again.

---

## Shared Trips

Multiple people can contribute memories.

The shared experience should still feel like one collection rather than a social feed.

---

## Offline Capture

Moments can be captured without connectivity and synchronized later.

The interface should make offline capture feel completely normal.

---

## Automatic Location

Location can quietly enrich moments when permission exists.

It should never become an input requirement.

---

## Export

Generate a beautiful chronological memory artifact.

Potential future formats:

* digital postcard collection
* printable travel journal
* PDF memory book
* shareable trip story

---

# 57. Design System Philosophy

Do not build a giant design system.

The product does not need dozens of generic components.

The core system can remain small:

```text
Trip
Moment
Postcard
Footnote
Day
Capture
Navigation
```

Everything should be derived from these primitives.

If a new component cannot be explained through the memory metaphor, question whether it belongs.

---

# 58. Component Rules

Avoid creating components such as:

```text
DashboardCard
MetricCard
StatusBadge
InsightCard
FeatureCard
RecommendationCard
```

Prefer conceptual objects:

```text
Postcard
Footnote
Memory
Day
Trip
```

The vocabulary of the codebase should reflect the vocabulary of the product.

---

# 59. Empty Space

Whitespace is a first-class design element.

Do not automatically fill available space.

A photograph surrounded by empty space can feel more valuable.

A sentence surrounded by empty space can feel more intimate.

The interface should sometimes feel almost empty.

That is intentional.

---

# 60. The Timeline Should Not Look Algorithmic

The timeline should not feel optimized.

Do not arrange everything into perfect mathematical grids.

Do not make every image the same width.

Do not force identical spacing between every memory.

Chronology provides structure.

Composition provides personality.

---

# 61. The Feeling of Discovery

The user should occasionally discover small details while scrolling.

For example:

```text
DAY TWO


         PHOTO


                         03

             we were supposed
             to leave at 7.
```

Or:

```text
PHOTO


11:47 PM


       this was the moment
       everyone got tired.
```

The interface should reward lingering.

---

# 62. Core Design Principle

The application should not feel designed around features.

It should feel designed around **memories**.

A conventional application says:

```text
Here are your records.
```

Postcards & Little Footnotes should say:

```text
Here is what happened.
```

---

# 63. Final Design Rule

The most important rule is:

> **Capture the moment. Add context if you want. Move on.**

And when the user comes back later:

> **Let them find the moment again.**

The application should feel like a place where small memories accumulate naturally.

Not a place where memories are managed.

Not a place where memories are optimized.

Not a place where AI turns memories into content.

Just a quiet collection of photographs and little footnotes from a life that happened somewhere else.

---

# 64. Change Log

### 2026-09-07

* Implemented core editorial UI styling.
* Implemented mobile-first responsive layout.
* Implemented warm typographic system.
* Built Trips list view.
* Built Create Trip flow.
* Built chronological Day-grouped timeline.
* Built low-friction Capture flow.
* Configured PWA installation prompts.
* Configured service worker app shell caching.

### 2026-09-08

* Finalized product name as **Postcards & Little Footnotes**.
* Introduced postcard and footnote as the two fundamental visual primitives.
* Replaced the conventional card/feed visual model with a memory-composition model.
* Reframed the interface around a digital travel desk rather than a scrapbook.
* Introduced deliberate visual variation between moments.
* Established photographs as the primary visual layer.
* Established footnotes as an intimate editorial layer.
* Added tactile references to paper, photographs, notebooks, printed ephemera, and travel objects.
* Removed generic dashboard, SaaS, glassmorphism, and AI-product visual language.
* Defined restrained motion principles.
* Defined controlled imperfection and asymmetrical composition.
* Established empty space as a core visual element.
* Preserved the low-friction capture philosophy.
* Preserved private Cloudflare R2 image storage.
* Preserved direct browser uploads and backend-generated short-lived image URLs.

---

# 65. One Sentence

**Postcards & Little Footnotes is a digital box of things you brought home from a trip.**
