import * as T from "../node_modules/three/build/three.module.js";

// A purpose-built mask shell: no scanned anatomy, ears, neck or eyeballs.
export function createMask() {
  const contour = [[-1.42,0],[-1.30,.28],[-1.03,.53],[-.68,.76],[-.22,.91],[.35,.96],[.92,.88],[1.34,.62],[1.53,0]];
  const widthAt = y => {
    if(y>1.34) return .62*Math.sqrt(Math.max(0,(1.53-y)/.19));
    for (let i=1;i<contour.length;i++) if(y<=contour[i][0]) {
      const [a,w]=contour[i-1], [b,v]=contour[i];
      return T.MathUtils.lerp(w,v,(y-a)/(b-a));
    }
    return 0;
  };
  const bell=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));
  const positions=[], indices=[],rows=100,cols=80;
  for(let r=0;r<=rows;r++) {
    const y=-1.42+2.95*r/rows, width=widthAt(y);
    for(let c=0;c<=cols;c++) {
      const u=-1+2*c/cols,x=u*width;
      let z=.14+.50*Math.sqrt(Math.max(0,1-u*u));
      // Broad shallow recesses replace anatomical eyes. A single wedge suggests a nose.
      z-=.095*bell(x,y,-.39,.33,.29,.15)+.095*bell(x,y,.39,.33,.29,.15);
      z+=.17*Math.max(0,1-Math.abs(x)/.22)*Math.max(0,1-Math.abs(y-.02)/.60);
      z+=.045*bell(x,y,0,-.72,.42,.27);
      const mouthY=-.57+.045*(x/.36)**2;
      z-=.028*Math.exp(-((x/.34)**6)-((y-mouthY)/.034)**2);
      // Keep the same coordinate convention as the particle sampler.
      positions.push(x/.59,y/.59+1.3,z/.59);
    }
  }
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++) {
    const a=r*(cols+1)+c,b=a+1,d=a+cols+1;
    indices.push(a,b,d,b,d+1,d);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const normals=Array.from(geometry.attributes.normal.array);geometry.dispose();
  return {positions,indices,normals};
}
