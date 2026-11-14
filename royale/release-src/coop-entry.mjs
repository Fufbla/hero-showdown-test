import {prepareReleaseArt} from './presentation.mjs';
import {prepareFourPowerArt} from '../four-powers/art.mjs';
await prepareReleaseArt();
await prepareFourPowerArt();
await import('../local-coop/app.mjs');
