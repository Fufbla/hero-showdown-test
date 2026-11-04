# Solo static release

The production switch is `MULTIPLAYER_ENABLED=false` in `release-config.mjs`.
The app does not import the multiplayer menu or instantiate its client while disabled.
Create/Join and account migration forms are absent. Disabled menu buttons say
“Online Multiplayer — Coming Soon.” All backend and networking source remains in Git.
No WebSocket server is needed or included in the static package.

## Build and launch

From the repository root, using Node 24:

```
node royale/tools/build-solo.mjs /absolute/empty/output
cd /absolute/empty/output
python3 -m http.server 8000
```

Open `http://localhost:8000/royale/` (redirects to `/royale/game/`). On a phone
on the same Wi-Fi, substitute the computer's LAN IP. Production requires HTTPS.
The archive contains only a `royale/` directory, never a replacement homepage.
Existing relative asset paths remain intact and approved asset bytes are unchanged.
Optional QA pages use disposable test sessions; server code, environment files,
database credentials, node_modules and test authentication services are not packaged.
The hash manifest lists every copied game resource.

## Save safety

Ordinary solo heroes use the existing local browser save keys and schemas. Saves
are device/browser/origin-local, not verified account or cross-device saves.
Use Pause > Save Game after leaving combat. Existing valid position, equipment,
XP and coins use the original save/load implementation. Moving between paths on
the same origin preserves local storage; changing domain/browser does not.
Never clear site data as part of an update or rollback. Keep the original playable
origin available when moving hosts. Do not copy an older save over an account save.

Previously transferred account heroes remain fenced: this release cannot retrieve
current cloud state without their backend, and will not resume a potentially stale
local backup. Backups and migration receipts are retained. Other local slots remain
playable. A damaged receipt fails closed instead of permitting conflicting writes.

## Hostinger deployment boundary

Hostinger AI Builder's documented agentic environment does not provide FTP, File
Manager, SFTP or SSH, and cannot directly import a GitHub/static project archive.
Its HTML embed capability is not a static asset hosting service. Do not submit this
archive to a whole-site deployment action: that could replace Healthia's homepage.

No authenticated Hostinger hosting tools are available in this session. Production
has not been changed. Connect the Hostinger hosted account integration at
https://mcp.hostinger.com and authorize hosting access (not Hostinger Mail). Do not
send tokens or passwords in chat. Before publishing, inspect the actual website,
plan's existing static-site capacity and backup/rollback operations.

If an existing PHP/HTML static site slot is included in the current plan, stage
this package there using its existing temporary HTTPS address, without buying
anything or changing DNS. Verify all assets and mobile saves on that actual origin.
Then add only a new `/royale` page to the existing Builder project, embedding or
linking to the staged game. This requires review of the actual Builder project
and its revision/restore workflow; it has not yet been performed.

Suggested embed (replace the placeholder with a verified HTTPS game URL):

```html
<iframe title="Hero Showdown Royale" src="https://STATIC-HOST/royale/"
  allow="fullscreen" allowfullscreen
  style="display:block;width:100%;height:100dvh;border:0"></iframe>
```

Also offer a direct full-page Play link. Safari may partition or restrict iframe
storage; test save/reload inside the embed and via the direct link separately.
Do not promise that existing saves from another origin will appear in the embed.
If no compatible existing static capacity is available, stop for a user decision;
do not purchase a plan or alter DNS.

For a confirmed conventional static host serving healthia.me, upload only the
namespaced `royale/` directory after backing up any existing directory at that path.
Do not upload a root index or replace TV/comics files. Smoke-test on a staging URL
first; then verify `/royale/`, all assets, browser errors and local save/reload.

## Rollback

Record the current Builder revision and export/backup before adding any route.
Retain a copy of any previous `royale/` folder and its manifest. Restore only that
folder or the newly added Builder route/revision if verification fails. Leave
browser saves, cloud records, other pages and DNS untouched. This release has no
database migration and does not start any backend process.

## Enable multiplayer later

Provision and test the existing secure backend and reviewed migrations according
to `multiplayer/DEPLOYMENT.md`, without trusting client imports. Configure the
HTTPS/WSS endpoint and account authentication, then change the switch to `true`,
rebuild, and rerun full tests plus independent-client/browser recovery checks.
The flag alone does not provision a server or make online play production-ready.

## Verification on 2026-11-04

Starting remote branch: `feature/royale-persistent-multiplayer` at
`64a922f23191f195a09c227661510b983fa8747d`; includes integration branch
`defec8c3d66a8a12cef9bf22d49eeccd835e6ce6` and its gameplay cleanup.
Baseline: 1,189 game tests + 57 multiplayer tests passed; no failures/skips.
Release: 1,192 game tests + 57 multiplayer tests passed; no failures/skips.
The three added tests cover disabled networking, account receipt protection and
explicit re-enablement delegation. No combat/save/art implementation was changed.

The static package was launched in Chromium without a multiplayer service:

- 130 layout, creator, customization, Tree/wardrobe and save/reload checks passed
  at 568×320, 667×375, 844×390, 932×430 and 1024×768.
- 61 synthetic control/event checks passed in each portrait and landscape run.
  Includes movement with rapid attacks, pointer capture, jump, all power button
  selection/callout suppression, pause/resume, focus loss and menu compatibility.
- 168 live platform-count checks passed across seven regions and tier 2/3 starts.
- A regular monster died through the actual Punch input; XP increased 0→14 and
  coins 0→1 with no routine reward notification.
- A regional boss encounter loaded in 844×390, warning/recovery status advanced,
  Steel Body activated, and repeated Jump input was exercised.
- The previously synchronous mobile test now waits for the existing asynchronous
  Tree entry/return transition before checking visibility; assertions are intact.

Automated coverage includes all powers, bosses, Power Armor, exact-position saves,
legacy compatibility and approved asset preservation. This run does not constitute
fresh manual visual approval of every hairstyle/helmet, every boss/power combat
sequence, physical iPhone/Safari behavior, or production-origin/iframe storage.
These remain required staging/device checks before claiming full iPhone validation.
No live Hostinger deployment or production rollback has been exercised.
