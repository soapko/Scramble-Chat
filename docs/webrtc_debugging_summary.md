# WebRTC Signaling Debugging Summary

## 1. Objective

The goal is to implement a real-time, peer-to-peer (P2P) chat application using WebRTC. The application is hosted on Netlify, and the signaling mechanism required to broker the initial P2P connection is intended to be built using Netlify Functions and Netlify Blobs for state management.

## 2. Initial Architecture

The intended architecture is as follows:

*   **Frontend:** A vanilla JavaScript client that handles the WebRTC connection lifecycle.
*   **Signaling:** A set of Netlify Functions (`webrtc-offer`, `webrtc-answer`, `webrtc-signals`) that act as the signaling server.
*   **State Management:** Netlify Blobs are used as the persistent store for signaling messages (offers and answers), allowing clients to communicate indirectly to establish a direct connection.

The flow should be:
1.  Client A generates a WebRTC offer.
2.  Client A POSTs this offer to the `/api/webrtc-offer` function, which stores it in a Netlify Blob.
3.  Client B periodically polls the `/api/webrtc-signals` function.
4.  The `webrtc-signals` function reads the offer from the blob store and sends it to Client B.
5.  Client B creates an answer and POSTs it to the `/api/webrtc-answer` function.
6.  Client A retrieves the answer via the `webrtc-signals` function, and the P2P connection is established.

## 3. The Core Problem

The application has consistently failed to establish a P2P connection. The user-facing symptom is that messages from other users only appear after the current user sends a message themselves.

Our investigation has revealed that this is an illusion created by a local chat history manager. The root cause is that the WebRTC signaling handshake never completes. The `webrtc-offer` function consistently fails with a `500 Internal Server Error`, preventing offers from being stored and retrieved by other clients.

## 4. Chronological Debugging Journey

Our debugging process has been a series of hypotheses, tests, and refutations.

### Attempt 1: In-Memory Fallback

*   **Hypothesis:** The initial problem was that Netlify Blobs were not configured, so the functions were failing. A simple in-memory `Map` object in a shared file could serve as a temporary signaling store.
*   **Action:** Implemented a `Map` in `_shared/signaling-store.js` as a fallback.
*   **Result:** Failed.
*   **Reason:** This approach fundamentally misunderstood the serverless execution model. Each call to a Netlify Function is a separate, stateless execution with its own memory space. The `Map` was created, written to, and destroyed in one function call, and was never visible to any other function call.

### Attempt 2: Manual Credentials & Environment Variables

*   **Hypothesis:** The `@netlify/blobs` library required manual credentials (`siteID` and `token`) to be passed to the `getStore()` function, and these credentials were not being provided.
*   **Action:**
    1.  Obtained the `siteID` from the Netlify CLI.
    2.  Generated a personal access `token`.
    3.  Set both as environment variables in the Netlify GUI (`NETLIFY_SITE_ID`, `NETLIFY_ACCESS_TOKEN`).
    4.  Modified the code to read these variables from `process.env` and pass them to `getStore()`.
*   **Result:** Failed. The exact same `MissingBlobsEnvironmentError` persisted.
*   **Reason:** The logs from a debug function proved that the environment variables set in the GUI were not being successfully injected into the function's runtime environment. `process.env.NETLIFY_SITE_ID` and `process.env.NETLIFY_ACCESS_TOKEN` were `undefined`.

### Attempt 3: Build-Time Provisioning (Frameworks API)

*   **Hypothesis:** Based on the Frameworks API documentation, perhaps the blob store needed to be explicitly created during the build process before it could be used at runtime.
*   **Action:**
    1.  Created a build script (`scripts/prepare-blobs.js`) to create the directory `.netlify/v1/blobs/webrtc-signaling`.
    2.  Configured `package.json` and `netlify.toml` to run this script during deployment.
*   **Result:** Failed. The same `MissingBlobsEnvironmentError` persisted.
*   **Reason:** This approach was based on a misunderstanding. The Frameworks API is for pre-populating a store with data at build time, but it does not solve the fundamental run-time authentication issue.

### Attempt 4: Hardcoding & Inlining (The Final Test)

*   **Hypothesis:** The issue might be with Netlify's module bundler (`esbuild`) failing to correctly include the shared file (`_shared/signaling-store.js`) that contained the fix.
*   **Action:**
    1.  Hardcoded the `siteID` and `token` directly into the `webrtc-offer.js` function, removing any dependency on shared files or environment variables.
*   **Result:** Failed. The exact same `MissingBlobsEnvironmentError` persisted.

## 5. Current State & The Final Error

This is the most critical finding: **even when the correct `siteID` and `token` are hardcoded directly into the function, the `@netlify/blobs` library still throws a `MissingBlobsEnvironmentError`.**

The final console log from the client shows:
```
[Error] Failed to load resource: the server responded with a status of 500 () (webrtc-offer, line 0)
[Error] Error sending offer: – Error: Failed to send offer: 500
```

The final function log for `webrtc-offer` shows:
```
ERROR  Error storing WebRTC offer: MissingBlobsEnvironmentError: The environment has not been configured to use Netlify Blobs. To use it manually, supply the following properties when creating a store: siteID, token
```

## 6. The Challenge for the New Engineer

The core puzzle is this:

**Why does the `@netlify/blobs` library fail with `MissingBlobsEnvironmentError` inside a deployed Netlify Function, even when the correct `siteID` and `token` are explicitly provided to it?**

We have proven:
*   The credentials (`siteID`, `token`) are correct, as the Netlify CLI can access the blob store with them.
*   The issue is not related to environment variable propagation, as hardcoding the credentials directly still fails.
*   The issue is not related to shared file bundling, as inlining the logic directly still fails.

The problem seems to be a fundamental incompatibility or misconfiguration between the function's execution environment and the Blobs service that the library cannot overcome. The "zero-config" promise of the platform is not working for this site, and the manual configuration escape hatch is also failing. A fresh perspective is needed to identify the missing piece.
