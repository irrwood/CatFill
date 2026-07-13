# CatFill Promo Video

A 25-second horizontal product video for **CatFill: AI Form Autofill**, built with Remotion.

## Format

- 1920 x 1080
- 30 fps
- 25 seconds
- English UI and copy
- H.264 video with AAC sound effects

## Preview

```sh
npm install
npm run dev
```

Open the `CatFillPromo` composition in Remotion Studio.

## Render

```sh
npm run lint
npx remotion render CatFillPromo output/CatFill-promo-1920x1080.mp4 --codec=h264 --crf=18
```

Rendered files are kept in `output/` and are intentionally excluded from Git.

## Structure

- `src/Composition.tsx`: scenes, motion, and timing
- `src/Root.tsx`: composition settings
- `public/brand/`: CatFill logo and writing-cat assets
- `public/ui/`: captured extension UI
- `public/audio/`: interface sound effects
