# Migrating from Clarifai to MediaPipe Face Detector

This guide documents the steps taken to replace the Clarifai-based face detection backend call with Google's MediaPipe Face Detector running entirely client-side in the browser.

## Overview

Previously, the app sent image URLs to a backend `/imageAPI` endpoint which called the Clarifai API and returned normalized bounding box coordinates. This update removes that dependency and performs face detection directly in the browser using MediaPipe's `@mediapipe/tasks-vision` package. The WASM runtime and model file are loaded from CDN at runtime — no local model files are needed.

The `/image` PUT endpoint (which increments the user's entry counter) is retained and continues to fire after each detection.

---

## Step 1: Install the dependency

```bash
npm install @mediapipe/tasks-vision
```

---

## Step 2: Update the import in `src/App.js`

Add the MediaPipe import alongside the existing imports:

```js
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
```

---

## Step 3: Add a class-level detector property

Inside the `App` class, declare a property to cache the detector instance so it is only initialized once:

```js
faceDetector = null;
```

---

## Step 4: Add the `getOrCreateFaceDetector` helper

This method lazily initializes the MediaPipe `FaceDetector` on first use and caches it. The WASM runtime is loaded from jsDelivr and the model from Google's CDN.

```js
getOrCreateFaceDetector = async () => {
  if (this.faceDetector) return this.faceDetector;
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
  );
  //define model asset path here. More models can be found here: https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector#models
  const modelAssetPath =
    "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_full_range/float16/1/blaze_face_full_range.tflite";

  this.faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath,
      delegate: "GPU",
    },
    runningMode: "IMAGE",
  });
  return this.faceDetector;
};
```

### Available models

| Model | URL path segment | Best for |
|---|---|---|
| `blaze_face_short_range` | `blaze_face_short_range/float16/1/blaze_face_short_range.tflite` | Faces close to the camera (selfies, video calls). Faster but struggles with small/distant faces. |
| `blaze_face_full_range` (used here) | `blaze_face_full_range/float16/1/blaze_face_full_range.tflite` | Faces at greater distances and varied angles. Slightly slower than short_range. |

All model URLs follow the base path: `https://storage.googleapis.com/mediapipe-models/face_detector/`

### Optional configuration options

The following options can be added to the `createFromOptions` call alongside `runningMode`:

- `minDetectionConfidence` (default: `0.5`) — Minimum confidence score (0.0–1.0) for a detection to be considered valid. Raise to reduce false positives; lower to catch more faces at the risk of more noise.
- `minSuppressionThreshold` (default: `0.3`) — Controls how aggressively overlapping bounding boxes are merged via non-maximum suppression. Lower values keep more overlapping boxes; higher values suppress them more aggressively.

---

## Step 5: Replace `calcFaceLocation`

The old implementation parsed Clarifai's normalized coordinates. The new version loads the image to determine its natural dimensions, runs MediaPipe detection, then scales the resulting pixel coordinates to match the 500px-wide rendered `<img>` element.

MediaPipe returns bounding boxes as `{ originX, originY, width, height }` in pixels relative to the image's natural size. These are converted to the `{ leftCol, topRow, rightCol, bottomRow }` format used for CSS absolute positioning.

```js
calcFaceLocation = async (imageUrl) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageUrl;
  });

  const faceDetector = await this.getOrCreateFaceDetector();
  const result = faceDetector.detect(img);

  const renderedWidth = 500;
  const scaleFactor = renderedWidth / img.naturalWidth;
  const renderedHeight = img.naturalHeight * scaleFactor;

  return result.detections.map((detection) => {
    const { originX, originY, width, height } = detection.boundingBox;
    return {
      leftCol: originX * scaleFactor,
      topRow: originY * scaleFactor,
      rightCol: renderedWidth - (originX + width) * scaleFactor,
      bottomRow: renderedHeight - (originY + height) * scaleFactor,
    };
  });
};
```

---

## Step 6: Replace `onButtonSubmit`

The old version chained two fetch calls — first to `/imageAPI`, then to `/image`. The new version is `async`, removes the `/imageAPI` call entirely, awaits `calcFaceLocation` directly, and then fires the `/image` counter increment.

```js
onButtonSubmit = async () => {
  this.setState({ imgURL: this.state.input });
  try {
    const boxes = await this.calcFaceLocation(this.state.input);
    this.displayFaceBox(boxes);
    fetch(`${SERVER_URL}/image`, {
      method: "put",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: this.state.user.id,
      }),
    })
      .then((res) => res.json())
      .then((count) => {
        this.setState(Object.assign(this.state.user, { entries: count }));
      });
  } catch (error) {
    console.log("error", error);
  }
};
```

---

## Files changed

| File | Change |
|---|---|
| `src/App.js` | Added import, detector cache property, `getOrCreateFaceDetector`, replaced `calcFaceLocation` and `onButtonSubmit` |
| `package.json` | Added `@mediapipe/tasks-vision` dependency |

No changes were required to `FaceRecognition.js`, `FaceRecognition.css`, or any other component — the bounding box data shape (`leftCol`, `topRow`, `rightCol`, `bottomRow`) is identical to what was used before.

---

## Notes

- On first detection there will be a brief delay while the WASM runtime and model file (~2MB) are downloaded from CDN. Subsequent detections are instant as the detector is cached.
- If webpack prints a warning about a missing `vision_bundle_mjs.js.map` file, this is harmless. The MediaPipe npm package does not include its source map file. It has no effect on runtime behavior. To suppress the warning, add `GENERATE_SOURCEMAP=false` to a `.env` file in the project root.
- Images must allow cross-origin access (`crossOrigin = "anonymous"` is set). Images from hosts that do not send CORS headers will fail to load for detection.
