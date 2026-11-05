// Explicit interface scope. No account/backend, multiplayer, save, combat or bitmap exceptions.
export const INTERFACE_BASE='f5b14a7dfc1555c257f8f726140294269d36a63f';
export const INTERFACE_FILES=new Set([
 'app.mjs','index.html','creator.mjs','landscape-layout.mjs','menu-gamepad.mjs',
 'interface-controls.css','spatial-navigation.mjs','controller-entry.mjs','color-options.mjs','compact-hud.mjs','skin-color.mjs',
 'style-c-source.mjs','style-c-face.mjs','style-c-body.mjs','style-c-turnaround.mjs','style-c-motion-paint.mjs',
 'tests/interface-preservation.mjs','tests/interface-regressions.test.mjs','tests/interface-browser.html','tests/interface-browser.mjs',
 'tests/menu-gamepad.test.mjs','tests/player-corrections-preservation.mjs','INTERFACE-VERIFICATION.md',
].map(p=>'royale/'+p));
