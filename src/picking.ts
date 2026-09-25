import type {AbstractMesh} from '@babylonjs/core';
/** A custom Babylon ray predicate must explicitly exclude disabled or hidden meshes. */
export const visiblePickable=(mesh:AbstractMesh):boolean=>mesh.isPickable&&mesh.isVisible&&mesh.isEnabled();
