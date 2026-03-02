# Cheese

A browser game where you click lily pads on water before they disappear. Click to score points, trigger ripples, and watch floating “+1” / “+3” text. Golden lily pads are worth more but last a shorter time.

## Run locally

1. Open a terminal in this folder (the one containing `index.html`).
2. Start a local HTTP server. For example:
   ```bash
   python3 -m http.server 8000
   ```
3. In your browser, go to: **http://localhost:8000**
4. Open `index.html` (e.g. **http://localhost:8000/index.html**) to play.

Using a local server is required so the game loads correctly (file:// can cause issues with some browsers).

## Upload to itch.io

1. Zip the game files so that **index.html is at the root** of the zip:
   - Include: `index.html`, `style.css`, `game.js` (and optionally `README.md`).
   - Do **not** put them inside a subfolder in the zip; the zip’s root should contain `index.html`.
2. On [itch.io](https://itch.io), create a new project (or edit an existing one).
3. Upload the zip as the game file.
4. In the project’s **Edit** page:
   - Under **Kind of project**, choose **HTML**.
   - Enable **This file will be played in the browser**.
   - Set **Run this file when the project is viewed** (or equivalent) to `index.html` if itch.io asks for an entry file.
5. Save and publish. The game will run in the browser.

## Controls

- **Mouse / touch**: Click or tap lily pads to score. Canvas resizes with the window.

## Tech

- Plain HTML5, CSS, and JavaScript; no frameworks.
- Canvas 2D for water, lily pads, ripples, and floating text.
- No external images or assets; water is drawn with gradients and simple animation.
# Cheese
