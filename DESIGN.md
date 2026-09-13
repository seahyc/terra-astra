---
name: Terra Astra
description: Geographic light becomes a personal constellation, then returns to Earth.
colors:
  background: "#03070b"
  foreground: "#e8edf0"
  human-ink: "#e9d7b3"
  display-emphasis: "#e1cba4"
  geographic-land: "#a8cfde"
  geographic-coast: "#d6e5e9"
  night-light: "#eed7a8"
  personal-star: "#ffdc99"
  personal-thread: "#e9bf78"
  muted-text: "#adbdc6"
  form-surface: "#061019ed"
  input-surface: "#0b1721"
  input-border: "#526573"
typography:
  display:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontWeight: 400
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "16px"
    lineHeight: 1.7
  label:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "14px"
rounded:
  control: "3px"
  panel: "4px"
components:
  place-input:
    backgroundColor: "{colors.input-surface}"
    rounded: "{rounded.control}"
    height: "44px"
  place-form:
    backgroundColor: "{colors.form-surface}"
    textColor: "{colors.human-ink}"
    rounded: "{rounded.panel}"
    padding: "25px"
---

# Design System: Terra Astra

## Overview

Earth, constellated: a dark spatial experience in which geographic particles remain the main composition. Cool light describes the planet; warmer stars and fine connections carry human meaning. Generous darkness, restrained controls, and expressive serif phrases let the object lead.

This records the built system, not a proposed redesign. Ground truth is `app/globals.css`, `app/personal-constellation-form.module.css`, `app/terra-experience.tsx`, and the rendering code in `lib/terra/`. The desktop Astra, form, ending, and phone-width Astra/ending captures in `../demo-tooling/qa/` support the composition descriptions; their release badges are historical capture state.

## Colors

**Primary — human light.** Human ink colors actions and personal content; display emphasis warms italic phrases. Personal stars and their threads are brighter focal accents. The night-light layer also carries warmth, so warmth is not an exclusive indicator of a selected place.

**Secondary — geographic light.** Cool land and pale coast particles establish the recognizable world. Rendering adds relief, interior, haze, and halo layers; the frontmatter captures representative anchors rather than every shader tint. Rendered color varies with glow, additive blending, and depth.

**Neutral — deep space.** The background stays nearly black. Foreground text is pale; supporting text recedes into blue-gray. Dark translucent panels and stronger input surfaces make reading possible without visually replacing the sky.

## Typography

Georgia supplies regular-weight display phrases, italic emphasis, story quotations, and the wordmark. Arial supplies body copy, place names, labels, controls, and provenance. Do not introduce a competing type family.

Opening display type scales from 48–84px on large layouts; personal headings use 40–68px, with smaller phone treatments. Body copy generally uses 14–16px with generous line height. Compact labels and provenance use 12–14px. Spaced uppercase text marks orientation and stage; place names and instructions retain normal case. The place chooser uses 16px input text on phones.

## Layout

The experience occupies a viewport-sized spatial stage. Desktop narrative sits left, generally inset 7vw, with the globe or opened volume occupying the larger right area. The wordmark and About action sit above; a stage indicator, journey action, and quiet attribution sit below. View controls form a narrow vertical rail on the right.

At the existing 700px breakpoint, the composition rearranges vertically: Astra and its stars appear above the personal panel; closing words appear above the returning Earth. Keep the three stars, copy, form, and navigation readable in their own available areas. Panels can scroll within bounded heights. Phone edges account for safe areas; the current stage has a 700px minimum height.

The history page is a separate, quiet reading surface: a centered content column, thin release dividers, and metadata beside prose on desktop, stacked on phones.

## Elevation & Depth

Depth belongs chiefly to the particles: relief, occlusion, brightness, atmospheric edge, and the reversible volumetric spiral. Earth opens into Astra using its existing spatial material and reforms its original geography. Personal stars retain their identity across the transformation and return to real geographic anchors; Astra's personal shape is a readable composition, not a scale map.

Interface depth is subdued. Story panels and the view rail use translucent dark surfaces and blur; story panels carry a soft shadow. The form is more opaque for legibility. Avoid escalating interface shadows or glow until they compete with the world. Preserve pause and reduced-motion behavior, including readable settled states.

## Shapes

Actions and inputs are nearly rectangular with subtly softened corners; story and form panels use the slightly larger panel radius. Circular icon targets and the rounded view rail are distinct utility shapes. Stars use luminous points and fine threads; labels sit beside them rather than covering their cores.

## Components

- **Journey actions:** warm text, a thin warm border, faint tinted fill, and a directional icon. Hover strengthens fill and border; keyboard focus has a visible warm outline. Secondary actions are quiet text buttons.
- **Three-place chooser:** a serif heading followed by three labeled searchable selections. Inputs have dark fills, clear outlines, and a stronger warm focus treatment. Results pair a place name with smaller regional context; errors are readable warm text. Primary submission spans the form width; reset is secondary.
- **Personal constellation:** three numbered places with their meanings, matched to warm stars and connecting threads. Change, clear, and return actions stay visible in the narrative area. Closing copy recalls the submitted places beside the reformed globe.
- **Story sheet:** a compact translucent reading panel with a serif name and quotation. Longer biography and place details reveal on request; mobile placement preserves space for the city.
- **View rail and stage bar:** small functional icons and quiet orientation text frame the canvas. Preserve accessible names, visible focus, and existing disabled states during movement.

## Do's and Don'ts

- Do keep the globe and transformed volume visually dominant.
- Do preserve the cool geographic / warm human relationship and the Georgia / Arial pairing.
- Do keep personal stars and their labels legible through desktop and phone compositions.
- Do preserve the visible connection between the three meaningful places and their return to Earth.
- Don't replace the authored sky with a generic card grid or decorative background treatment.
- Don't turn faint interfaces into competing luminous objects.
- Don't describe imagined interior material or the personal Astra arrangement as measured geography.
