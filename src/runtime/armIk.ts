import { Vector3 } from '@babylonjs/core';
export interface ArmSolution { elbow: Vector3; wrist: Vector3; clamped: boolean }
/** Two bones, lengths in metres. Pole specifies the elbow's preferred bend direction. */
export function solveArm(shoulder: Vector3, target: Vector3, upper: number, lower: number, pole: Vector3): ArmSolution {
  if (!(upper>0 && lower>0) || ![...shoulder.asArray(),...target.asArray(),...pole.asArray(),upper,lower].every(Number.isFinite)) throw new Error('Invalid arm geometry');
  const delta=target.subtract(shoulder), raw=delta.length();
  const direction=raw>1e-8?delta.scale(1/raw):Vector3.Forward();
  const distance=Math.min(upper+lower-1e-7,Math.max(Math.abs(upper-lower)+1e-7,raw));
  let bend=pole.subtract(direction.scale(Vector3.Dot(pole,direction)));
  if(bend.lengthSquared()<1e-10) { const axis=Math.abs(direction.y)<.9?Vector3.Up():Vector3.Right(); bend=axis.subtract(direction.scale(Vector3.Dot(axis,direction))); }
  bend.normalize();
  const along=(upper*upper-lower*lower+distance*distance)/(2*distance);
  const height=Math.sqrt(Math.max(0,upper*upper-along*along));
  return {elbow:shoulder.add(direction.scale(along)).add(bend.scale(height)),wrist:shoulder.add(direction.scale(distance)),clamped:Math.abs(raw-distance)>1e-6};
}
