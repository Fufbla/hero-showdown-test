// Independent design oracle for the approved damage revision. Item additions do
// not receive the mastery multiplier. Exact endpoints are also checked separately.
export function expectedDamage(id,level,hero=1,eq={}){
 const h=hero-1,p=level-1,natural=10+2*h;
 const innate={strength:45+8*p+2*natural,superKick:16+2*p+.5*natural,fireball:24+5*p+2*h,roots:6+2*p+.45*h,whirlwind:10+3*p+.6*h}[id];
 const mastery={strength:6,superKick:4.5,fireball:3,roots:14,whirlwind:12}[id];
 const value=innate*(1+(mastery-1)*Math.min(19,p)/19*(.35+.65*Math.min(1,h/98)));
 return value+(id==='strength'?2*(eq.strength||0)+(eq.damage||0):id==='superKick'?.5*(eq.strength||0)+(eq.damage||0):eq[id]||0);
}
export const near=(actual,expected)=>{if(Math.abs(actual-expected)>1e-6)throw Error(`${actual} != ${expected}`);};
