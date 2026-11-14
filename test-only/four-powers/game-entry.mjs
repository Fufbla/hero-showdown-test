import {requireTestAccount} from './review.mjs';
import {prepareReleaseArt} from '../../royale/release-src/presentation.mjs';
import {prepareFourPowerArt} from './art.mjs';
requireTestAccount();
await prepareReleaseArt();await prepareFourPowerArt();
await import('../../royale/app.mjs');
