import { useModelStore } from './src/store/modelStore.ts';
import { v4 as uuidv4 } from 'uuid';

async function runTest() {
  console.log('=== START REPRODUCTION TEST ===');

  const store = useModelStore.getState();
  
  // 1. 初期モデル状態をモック
  const uuid1 = 'uuid-1';
  const gateXId = 'gate-x';
  const gateYId = 'gate-y';
  const topGateId = 'top-gate';

  const mockModel = {
    id: 'project-1',
    name: 'Test Project',
    basicEvents: [
      {
        id: uuid1,
        name: 'Basic Event 1',
        eventId: 'BE-01',
        tags: [],
        failureType: 'time' as const,
        failureRate: 1e-4,
        probability: 1e-4,
        distribution: { type: 'point' as const },
        source: '',
        memo: '',
      }
    ],
    faultTrees: [
      {
        id: 'ft-1',
        name: 'Fault Tree 1',
        topGateId: topGateId,
        gates: [
          {
            id: topGateId,
            name: 'Top Gate',
            type: 'OR' as const,
            children: [gateXId, gateYId],
            position: { x: 0, y: 0 }
          },
          {
            id: gateXId,
            name: 'Gate X',
            type: 'AND' as const,
            children: [uuid1],
            position: { x: -100, y: 100 }
          },
          {
            id: gateYId,
            name: 'Gate Y',
            type: 'AND' as const,
            children: [uuid1],
            position: { x: 100, y: 100 }
          }
        ]
      }
    ],
    eventTrees: [],
    initiatingEvents: [],
    endStates: [],
    ccfGroups: [],
    parameters: []
  };

  // ストアの状態を設定
  useModelStore.setState({ model: mockModel as any });

  console.log('Initial Store State:');
  console.log('basicEvents:', useModelStore.getState().model.basicEvents.map(e => ({ id: e.id, eventId: e.eventId })));
  console.log('Gate X children:', useModelStore.getState().model.faultTrees[0].gates.find(g => g.id === gateXId)?.children);
  console.log('Gate Y children:', useModelStore.getState().model.faultTrees[0].gates.find(g => g.id === gateYId)?.children);

  // 2. 1回目のローカル変更：Gate X配下の uuid-1 を BE-02 に変更
  console.log('\n--- Perform 1st Local Rename (Gate X: BE-01 -> BE-02) ---');
  const baseEvent1 = useModelStore.getState().model.basicEvents.find(e => e.id === uuid1)!;
  const uuid2 = useModelStore.getState().cloneAndUpdateBasicEventLocal(
    'ft-1',
    gateXId,
    baseEvent1,
    'BE-02'
  );

  console.log('After 1st Rename:');
  console.log('basicEvents:', useModelStore.getState().model.basicEvents.map(e => ({ id: e.id, eventId: e.eventId })));
  console.log('Gate X children:', useModelStore.getState().model.faultTrees[0].gates.find(g => g.id === gateXId)?.children);
  console.log('Gate Y children:', useModelStore.getState().model.faultTrees[0].gates.find(g => g.id === gateYId)?.children);

  // 3. 2回目のローカル変更：Gate Y配下の uuid-1 を BE-03 に変更
  console.log('\n--- Perform 2nd Local Rename (Gate Y: BE-01 -> BE-03) ---');
  const baseEvent2 = useModelStore.getState().model.basicEvents.find(e => e.id === uuid1)!;
  const uuid3 = useModelStore.getState().cloneAndUpdateBasicEventLocal(
    'ft-1',
    gateYId,
    baseEvent2,
    'BE-03'
  );

  console.log('After 2nd Rename:');
  console.log('basicEvents:', useModelStore.getState().model.basicEvents.map(e => ({ id: e.id, eventId: e.eventId })));
  console.log('Gate X children:', useModelStore.getState().model.faultTrees[0].gates.find(g => g.id === gateXId)?.children);
  console.log('Gate Y children:', useModelStore.getState().model.faultTrees[0].gates.find(g => g.id === gateYId)?.children);

  console.log('=== TEST END ===');
}

runTest();
