import {prepareReleaseArt} from '../../royale/release-src/presentation.mjs';
import {prepareFourPowerArt} from '../../royale/four-powers/art.mjs';
await prepareReleaseArt();
await prepareFourPowerArt();
await import('../../royale/app.mjs');
