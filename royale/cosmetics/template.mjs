// Candidate fixed rig contract. Not activated in the live renderer until the
// approved Style C body/head layers have been fitted and visually reviewed.
export const TEMPLATE_ID='universal-style-c-v1';
export const VIEWS=Object.freeze(['front','right','back','left']);
export const PARTS=Object.freeze(['headwear','torso','upperArmNear','upperArmFar','forearmNear','forearmFar','handNear','handFar','hips','thighNear','thighFar','shinNear','shinFar','footNear','footFar','skirt','accessory','cape']);
export const FIXED_PROPORTIONS=Object.freeze({build:'balanced',age:'young',height:1,shoulders:1,chest:1,waist:1,hips:1,torso:1,arms:1,legs:1,muscle:.35,jaw:1,face:'oval'});
export function universalRenderLook(look){return {...look,...FIXED_PROPORTIONS};}
// Origin is floor between ankles; source texels are .35 world units. All
// genders use these anchors. Face materials remain separate from body geometry.
export const MASTER_ANCHORS=Object.freeze({
 head:[0,-201],neck:[0,-151],shoulderNear:[36,-142],shoulderFar:[-49,-144],
 elbowNear:[44,-116],elbowFar:[-54,-119],wristNear:[56,-103],wristFar:[-49,-97],
 waist:[0,-98],hipNear:[14,-96],hipFar:[-12,-96],kneeNear:[33,-50],kneeFar:[-24,-52],ankleNear:[44,-14],ankleFar:[-34,-15]
});
export const attachmentPoints=pose=>({head:pose.head,neck:pose.shoulder,waist:pose.hip,
 shoulderNear:pose.arms[0][0],shoulderFar:pose.arms[1][0],elbowNear:pose.arms[0][1],elbowFar:pose.arms[1][1],wristNear:pose.arms[0][2],wristFar:pose.arms[1][2],
 hipNear:pose.legs[0][0],hipFar:pose.legs[1][0],kneeNear:pose.legs[0][1],kneeFar:pose.legs[1][1],ankleNear:pose.legs[0][2],ankleFar:pose.legs[1][2]});
export const PASSES=Object.freeze(['behindBody','farLeg','nearLeg','torso','farArm','nearArm','behindHead','headwear','accessory']);
