# tools

`build.mjs` generates every SVG in `../assets` (dark and light). Type is converted to
outlines so GitHub renders it identically, since it blocks web fonts inside `<img>` SVGs.

    npm i fontkit            # in any scratch dir
    NODE_PATH=<that dir>/node_modules node tools/build.mjs

Fonts in `fonts/`: Bricolage Grotesque and Martian Mono, both SIL OFL 1.1.

Logos: Simple Icons (CC0) via `npm i simple-icons`, plus `icons/vscode.svg` from Devicon (MIT).
Logos are trademarks of their owners and appear only to name the tools used.
