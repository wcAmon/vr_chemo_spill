import type {ModelFactory} from './shared/types';
export const registry:Record<string,()=>Promise<{default:ModelFactory}>>={
 'action-figure':()=>import('./models/action-figure/createActionFigureModel'),
 'chemo-spill-kit':()=>import('./models/chemo-spill-kit/createChemoSpillKitModel'),
 'chemo-iv-bag':()=>import('./models/chemo-iv-bag/createChemoIvBagModel'),
 'cytotoxic-waste-bin':()=>import('./models/cytotoxic-waste-bin/createCytotoxicWasteBinModel'),
 'spill-warning-sign':()=>import('./models/spill-warning-sign/createSpillWarningSignModel'),
 'absorbent-pad':()=>import('./models/absorbent-pad/createAbsorbentPadModel'),
 'ppe-set':()=>import('./models/ppe-set/createPpeSetModel'),
 'cytotoxic-waste-bag':()=>import('./models/cytotoxic-waste-bag/createCytotoxicWasteBagModel'),
};
