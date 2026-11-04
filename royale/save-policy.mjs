// Ordinary adventure progress advances only on an explicit save. Creation and
// confirmed economic/irreversible transactions use their own durable paths.
export const shouldWriteAdventure = ({manual=false,heroId=null,safe=false,pending=false}={}) => safe&&!pending&&(manual||!heroId);
