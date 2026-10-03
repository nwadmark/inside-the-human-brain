# Inside the Human Brain

An AI-assisted, cinematic 3D journey through the human brain.

This interactive learning experience turns neuroscience into an explorable story: travel from whole-brain anatomy to cortical regions, neurons, synapses, glial cells, networks, memory, perception, movement, emotion, and sleep.

## Live experience

[Enter the interactive brain](https://nwadmark.github.io/inside-the-human-brain/)

This is designed to be experienced, not skimmed: start the journey, then use **Explore** to take control of the model.

## What this demonstrates

- Product direction for an AI-native learning experience
- Interactive 3D storytelling with Three.js
- Research-based cortical and subcortical anatomy
- Guided learning, free exploration, simulations, and “What if?” thought experiments
- Audio ambience, optional narration, captions, responsive controls, and accessibility considerations

## How it was built

The experience was directed and built as an AI-assisted product-development experiment using OpenAI’s Astra model. The human-led work defined the audience, learning objectives, scientific guardrails, narrative arc, interaction model, visual language, and quality bar; the model accelerated exploration, implementation, iteration, and refinement across the experience.

The important product lesson is not “AI generated a website.” It is that a strong human product brief can act as a harness for AI: it gives the model context, constraints, evaluation criteria, and a coherent experience to build toward. This repository is a working example of that human–AI collaboration.

## Scientific representation

The cerebral cortex uses the MRI-derived FreeSurfer fsaverage5 research template with Desikan-Killiany labels. Compatible ENIGMA meshes provide selected deep structures. The cerebellum, brainstem, spinal cord, hypothalamus, corpus callosum, body, cells, vessels, pathways, and molecular scenes are simplified teaching models. They are clearly identified in the experience and are not diagnostic anatomy or measurements of an individual brain.

The app distinguishes between established evidence, best current models, and open scientific questions. See the in-product **Science & Sources** dialog for references, anatomy provenance, and license notices.

## Attribution

See the files in `assets/` for the Three.js license, research anatomy notices, FreeSurfer/Nilearn/ENIGMA attribution, font license, and image attribution.

## Running locally

Serve this folder over HTTP because the app loads ES modules and local anatomy assets:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.
