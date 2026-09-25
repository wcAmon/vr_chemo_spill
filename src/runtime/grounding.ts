import type {Vector3} from '@babylonjs/core';
export interface FootGround {y:number;normal:Vector3}
export interface GroundState {left:FootGround|null;right:FootGround|null;normal:Vector3}
