'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { setItem as setIDBItem, getItem as getIDBItem } from '@/lib/db';
import * as d3 from 'd3';
import type { PRAModel, BasicEvent, HouseEvent, Gate, FaultTree, EndState, Parameter, CCFGroup, InitiatingEvent, EventTree, Sequence, FunctionalEvent, Branch, GateType, GlobalQuantificationSettings, SeismicSettings, SeismicHazardCurve, SeismicFragility, RecoveryGroup, RecoveryRule } from '@/lib/types';

// ===== Default Sample Model =====
function createDefaultModel(): PRAModel {
  return {
  "id": "e870c452-77b5-40f4-a969-eabd2b99ee08",
  "name": "サンプルPRAモデル",
  "description": "ECCS注入失敗を対象としたサンプルFault Tree",
  "version": 1,
  "locale": "ja",
  "createdAt": "2026-04-26T00:38:37.584Z",
  "updatedAt": "2026-05-27T13:34:00.276Z",
  "faultTrees": [
    {
      "id": "cf187f39-aba2-4cc1-9674-1401731bd665",
      "name": "ECCS注入失敗 FT",
      "topGateId": "3ded9df2-2df8-44be-8f8e-ffa7745f8213",
      "gates": [
        {
          "id": "3ded9df2-2df8-44be-8f8e-ffa7745f8213",
          "name": "ECCS注入失敗",
          "type": "OR",
          "children": [
            "07d756f1-1886-4f07-a13e-c25dcaf6ac1b",
            "2ae889ba-5914-4f1c-af43-e19353152f76"
          ],
          "position": {
            "x": 400,
            "y": 270
          }
        },
        {
          "id": "2ae889ba-5914-4f1c-af43-e19353152f76",
          "name": "電源喪失",
          "type": "OR",
          "children": [
            "8d49c3a7-fc57-4d69-8739-09bb4ef3ae88",
            "98733dd7-4bc0-4ae6-805f-799c51919cff"
          ],
          "position": {
            "x": 940,
            "y": 490
          },
          "collapsed": false
        },
        {
          "id": "98733dd7-4bc0-4ae6-805f-799c51919cff",
          "name": "ANDゲート",
          "type": "AND",
          "children": [
            "ea44190c-c1b2-47cc-9876-5b370eeaaca7",
            "46a5b753-a3b6-4df3-a282-7f4f25e11276"
          ],
          "position": {
            "x": 1060,
            "y": 710
          }
        },
        {
          "id": "b5ae6c35-7f30-4e6c-a6f0-0dc8af519818",
          "name": "ANDゲート",
          "type": "AND",
          "children": [
            "1e7d53c1-8f04-4457-8174-75769dff183d",
            "baebee2c-d8de-44c5-a41a-6c321289309a"
          ],
          "position": {
            "x": -380,
            "y": 710
          },
          "collapsed": false
        },
        {
          "id": "07d756f1-1886-4f07-a13e-c25dcaf6ac1b",
          "name": "新規ORゲート",
          "type": "OR",
          "children": [
            "b5ae6c35-7f30-4e6c-a6f0-0dc8af519818",
            "36a8be06-1a16-450f-ac10-bb808a6aed49",
            "7915764c-8f54-49d2-a453-c26f10a1986f"
          ],
          "position": {
            "x": -140,
            "y": 490
          }
        },
        {
          "id": "1e7d53c1-8f04-4457-8174-75769dff183d",
          "name": "A系",
          "type": "OR",
          "children": [
            "00fbe377-77b7-4eca-aca8-0fdd997d0814",
            "45c25367-586d-4b11-be98-b08438f2359a",
            "c570a960-ff7e-48e1-ba12-01de3da9b269"
          ],
          "position": {
            "x": -860,
            "y": 930
          },
          "collapsed": false
        },
        {
          "id": "baebee2c-d8de-44c5-a41a-6c321289309a",
          "name": "B系",
          "type": "OR",
          "children": [
            "229f8d1c-197c-4929-a587-d829c70df88f",
            "d6c38cb0-83bf-4d53-afd2-2de36256b69c",
            "ecff3c51-d27d-4e47-a257-a413da92944d"
          ],
          "position": {
            "x": 100,
            "y": 930
          },
          "collapsed": false
        },
        {
          "id": "ea44190c-c1b2-47cc-9876-5b370eeaaca7",
          "name": "新規ORゲート",
          "type": "OR",
          "children": [
            "7f7ac691-a37f-4e1f-b20f-acaf0e1aa643",
            "9eed4687-4781-4e84-9a26-4fef2fb87838"
          ],
          "position": {
            "x": 940,
            "y": 930
          }
        }
      ]
    },
    {
      "id": "c010528f-7713-4bbb-80bd-f460cb6b96b7",
      "name": "除熱FT",
      "topGateId": "43810738-79c1-4f8d-acf7-81e53042e86a",
      "gates": [
        {
          "id": "43810738-79c1-4f8d-acf7-81e53042e86a",
          "name": "TOP EVENT",
          "type": "OR",
          "children": [
            "74b3bb44-7d03-4487-83a0-017c5d18afe9",
            "0f1fdfb9-8885-4b40-a621-7c4e27a8e118",
            "28b92623-8081-4c3a-a420-3835081bfcba"
          ],
          "position": {
            "x": 400,
            "y": 50
          },
          "collapsed": false
        },
        {
          "id": "74b3bb44-7d03-4487-83a0-017c5d18afe9",
          "name": "ANDゲート",
          "type": "AND",
          "children": [
            "face8671-66aa-4853-8e7b-87339ed448fd",
            "0d3535b8-716f-4792-879d-b4ad8c10e93c"
          ],
          "position": {
            "x": 160,
            "y": 250
          }
        }
      ]
    },
    {
      "id": "cd1d3f6f-51a9-40fa-84d8-e0dc1a776ab5",
      "name": "循環参照検証用1",
      "topGateId": "d1eb74fd-c260-479f-a846-fe36b249c783",
      "gates": [
        {
          "id": "d1eb74fd-c260-479f-a846-fe36b249c783",
          "name": "TOP EVENT",
          "type": "OR",
          "children": [
            "a8a5d4b4-4a3a-4e3b-a263-f272f1565bc1",
            "3b4fcc8a-e540-47a3-915d-1f65693344ff"
          ],
          "position": {
            "x": 400,
            "y": 50
          },
          "collapsed": false
        }
      ]
    },
    {
      "id": "dc2948b2-b736-4ab0-9e24-bad9cffa9fec",
      "name": "循環参照検証用2",
      "topGateId": "0e7bf2f9-178d-497f-8c1f-a19a85ffd041",
      "gates": [
        {
          "id": "0e7bf2f9-178d-497f-8c1f-a19a85ffd041",
          "name": "TOP EVENT",
          "type": "OR",
          "children": [
            "5dd2c600-63b2-46f7-85ad-4c521745c1a0",
            "eba0865d-4596-4b22-a284-e6cc4cffe25d",
            "430968e5-4d9c-447d-8dcb-3341eef8dfc7"
          ],
          "position": {
            "x": 400,
            "y": 50
          }
        }
      ]
    },
    {
      "id": "3d61264e-4a5a-4d34-8777-ea5444e7dcf1",
      "name": "地震用FT Test1",
      "topGateId": "fb21a63e-336c-4a9c-9210-d2801683d484",
      "gates": [
        {
          "id": "fb21a63e-336c-4a9c-9210-d2801683d484",
          "name": "TOP EVENT",
          "type": "OR",
          "children": [
            "e5d0da72-6467-4cbf-ae2b-a3023699dfd5",
            "813cd2f4-8a11-47d2-9196-8db7f680fe90",
            "8290b4d9-8ff4-40db-beae-118f074d48fe",
            "4c2f0a78-e286-4af1-9a05-3b1be4062244",
            "29c3116a-c495-4087-9ca0-5eb2bec667ab"
          ],
          "position": {
            "x": 400,
            "y": 50
          }
        }
      ]
    }
  ],
  "eventTrees": [
    {
      "id": "d0654510-8e04-4d58-a673-1e7cd95950c5",
      "name": "New ET",
      "initiatingEventId": "IE_1778255565935",
      "functionalEvents": [
        {
          "id": "b5f5a0ce-02fa-4e51-ad9e-874ccfac0e5a",
          "name": "注水機能",
          "branches": [
            {
              "id": "success",
              "label": "Success"
            },
            {
              "id": "failure",
              "label": "Failure"
            }
          ],
          "linkedFaultTreeId": "cf187f39-aba2-4cc1-9674-1401731bd665",
          "code": "ECCS1"
        },
        {
          "id": "b3dce593-25e2-4239-8941-36654a6c96af",
          "name": "除熱機能",
          "branches": [
            {
              "id": "success",
              "label": "Success",
              "description": "成功"
            },
            {
              "id": "failure",
              "label": "Failure",
              "description": "失敗"
            }
          ],
          "linkedFaultTreeId": "c010528f-7713-4bbb-80bd-f460cb6b96b7",
          "code": "ECCS2"
        },
        {
          "id": "f7d340d7-fee3-4c18-a3aa-b246528d3fbb",
          "name": "Header13",
          "branches": [
            {
              "id": "success",
              "label": "Success"
            },
            {
              "id": "failure",
              "label": "Failure",
              "description": "",
              "probability": 0.1
            }
          ],
          "code": "HEA",
          "linkedFaultTreeId": ""
        }
      ],
      "sequences": [
        {
          "id": "ee8de310-1738-449b-9dbd-372ff9e170bd",
          "path": [
            {
              "functionalEventId": "b5f5a0ce-02fa-4e51-ad9e-874ccfac0e5a",
              "branchId": "success"
            },
            {
              "functionalEventId": "b3dce593-25e2-4239-8941-36654a6c96af",
              "branchId": "success"
            }
          ],
          "endStateId": "16647e4a-e88e-4680-9379-824529ea06cf",
          "name": "TEST-01"
        },
        {
          "id": "6a8482c5-bfae-49d1-a52d-6a0796f27003",
          "path": [
            {
              "functionalEventId": "b5f5a0ce-02fa-4e51-ad9e-874ccfac0e5a",
              "branchId": "success"
            },
            {
              "functionalEventId": "b3dce593-25e2-4239-8941-36654a6c96af",
              "branchId": "failure"
            }
          ],
          "endStateId": "89df86f8-f1ef-4425-8cbf-e90c58182d45",
          "name": "TEST-02"
        },
        {
          "id": "2f6b5331-b5e8-490f-bf46-956f0fdf3ee0",
          "path": [
            {
              "functionalEventId": "b5f5a0ce-02fa-4e51-ad9e-874ccfac0e5a",
              "branchId": "failure"
            },
            {
              "functionalEventId": "b3dce593-25e2-4239-8941-36654a6c96af",
              "branchId": "success"
            }
          ],
          "endStateId": "16647e4a-e88e-4680-9379-824529ea06cf",
          "name": "TEST-03"
        },
        {
          "id": "fd7666d9-8967-4a30-881b-a39ff6e47b42",
          "path": [
            {
              "functionalEventId": "b5f5a0ce-02fa-4e51-ad9e-874ccfac0e5a",
              "branchId": "failure"
            },
            {
              "functionalEventId": "b3dce593-25e2-4239-8941-36654a6c96af",
              "branchId": "failure"
            }
          ],
          "endStateId": "1b3d73da-bc82-4715-a610-54d83a8256c5",
          "name": "TEST-04"
        }
      ]
    },
    {
      "id": "315210c7-324f-4a5c-93b5-ca6b04376d42",
      "name": "トランスファーET検証用2",
      "initiatingEventId": "898e9e47-586a-4132-ac5d-e88cdd2d7da9",
      "functionalEvents": [
        {
          "id": "846c1588-703f-4d77-bd11-86188eb062bd",
          "name": "Header",
          "branches": [
            {
              "id": "success",
              "label": "成功"
            },
            {
              "id": "failure",
              "label": "失敗"
            }
          ],
          "code": "HEA",
          "linkedFaultTreeId": "cf187f39-aba2-4cc1-9674-1401731bd665"
        }
      ],
      "sequences": [
        {
          "id": "c595d301-212d-47a9-a3c2-36fe8fd45f8f",
          "path": [
            {
              "functionalEventId": "846c1588-703f-4d77-bd11-86188eb062bd",
              "branchId": "success"
            }
          ],
          "endStateId": "16647e4a-e88e-4680-9379-824529ea06cf",
          "name": "TEST-01"
        },
        {
          "id": "26a438a3-82dd-40f0-8461-487f4bd10582",
          "path": [
            {
              "functionalEventId": "846c1588-703f-4d77-bd11-86188eb062bd",
              "branchId": "failure"
            }
          ],
          "endStateId": "1b3d73da-bc82-4715-a610-54d83a8256c5",
          "name": "TEST-02"
        }
      ]
    },
    {
      "id": "4705f10f-e6bc-47f6-97bb-4fbb95a8ceef",
      "name": "トランスファーET検証用1",
      "initiatingEventId": "898e9e47-586a-4132-ac5d-e88cdd2d7da9",
      "functionalEvents": [
        {
          "id": "30b9d50b-a1a7-4dcd-82ae-ef02df115536",
          "name": "Header",
          "branches": [
            {
              "id": "success",
              "label": "成功"
            },
            {
              "id": "failure",
              "label": "失敗",
              "probability": 0.5
            }
          ],
          "code": "HEA",
          "linkedFaultTreeId": ""
        }
      ],
      "sequences": [
        {
          "id": "e8c2fb2f-ea3e-4220-8e12-4fc1dc3b6eb8",
          "path": [
            {
              "functionalEventId": "30b9d50b-a1a7-4dcd-82ae-ef02df115536",
              "branchId": "success"
            }
          ],
          "endStateId": "16647e4a-e88e-4680-9379-824529ea06cf",
          "name": "TEST-01"
        },
        {
          "id": "d7578d94-49fd-4612-8b22-52f2c549a999",
          "path": [
            {
              "functionalEventId": "30b9d50b-a1a7-4dcd-82ae-ef02df115536",
              "branchId": "failure"
            }
          ],
          "endStateId": "182706df-5681-4721-8c8c-99911fa5b71b",
          "name": "TEST-02",
          "transferETId": "315210c7-324f-4a5c-93b5-ca6b04376d42"
        }
      ]
    }
  ],
  "basicEvents": [
    {
      "id": "7f7ac691-a37f-4e1f-b20f-acaf0e1aa643",
      "name": "DG-FAIL-START",
      "tags": [
        "電源",
        "DG"
      ],
      "failureRate": 0.03,
      "probability": 0.72,
      "distribution": {
        "type": "lognormal",
        "mean": 0.03,
        "errorFactor": 3
      },
      "source": "NUREG/CR-6928",
      "memo": "ディーゼル発電機起動失敗",
      "position": {
        "x": 820,
        "y": 1150
      },
      "eventId": "DG-START-ID"
    },
    {
      "id": "46a5b753-a3b6-4df3-a282-7f4f25e11276",
      "name": "外部電源",
      "eventType": "basicEvent",
      "tags": [],
      "failureType": "time",
      "failureRate": 0.0001,
      "probability": 0.0001,
      "missionTime": 24,
      "demands": 1,
      "distribution": {
        "type": "lognormal",
        "mean": 0.0001,
        "errorFactor": 3
      },
      "source": "",
      "memo": "",
      "position": {
        "x": 1180,
        "y": 930
      }
    },
    {
      "id": "a8a5d4b4-4a3a-4e3b-a263-f272f1565bc1",
      "name": "新規基事象_2",
      "eventType": "basicEvent",
      "tags": [],
      "failureType": "time",
      "failureRate": 0.0001,
      "probability": 0.0001,
      "missionTime": 24,
      "demands": 1,
      "distribution": {
        "type": "lognormal",
        "mean": 0.0001,
        "errorFactor": 3
      },
      "source": "",
      "memo": "",
      "position": {
        "x": 280,
        "y": 250
      }
    },
    {
      "id": "face8671-66aa-4853-8e7b-87339ed448fd",
      "name": "新規基事象_3",
      "eventType": "basicEvent",
      "tags": [],
      "failureType": "time",
      "failureRate": 0.0001,
      "probability": 0.0001,
      "missionTime": 24,
      "demands": 1,
      "distribution": {
        "type": "lognormal",
        "mean": 0.0001,
        "errorFactor": 3
      },
      "source": "",
      "memo": "",
      "position": {
        "x": 520,
        "y": 250
      },
      "linkedFaultTreeId": "dc2948b2-b736-4ab0-9e24-bad9cffa9fec"
    },
    {
      "id": "45c25367-586d-4b11-be98-b08438f2359a",
      "name": "HPCIポンプ(A)",
      "tags": [
        "HPI",
        "注入"
      ],
      "failureRate": 0.0001,
      "probability": 0.0024000000000000002,
      "distribution": {
        "type": "beta",
        "mean": 0.0002,
        "errorFactor": 3
      },
      "source": "NUREG/CR-6928",
      "memo": "高圧注入系トレイン故障",
      "position": {
        "x": -860,
        "y": 1150
      },
      "missionTime": 24,
      "parameterId": "038628ae-6af9-41ee-945e-fedaf7776c86",
      "failureType": "time",
      "eventId": "HPCI-A-2"
    },
    {
      "id": "00fbe377-77b7-4eca-aca8-0fdd997d0814",
      "name": "HPCIポンプ(A)_2",
      "tags": [
        "ECCS",
        "ポンプ"
      ],
      "failureRate": 0.001,
      "repairTime": 24,
      "probability": 0.01,
      "missionTime": 24,
      "distribution": {
        "type": "lognormal",
        "mean": 0.00003,
        "errorFactor": 3
      },
      "source": "NUREG/CR-6928",
      "memo": "ECCSポンプ起動失敗",
      "parameterId": "79a2529c-dee4-4d7f-b402-5c9e3c17dea4",
      "failureType": "demand",
      "position": {
        "x": -1100,
        "y": 1150
      },
      "seismicFragilityId": "0a28cd4b-490a-41cb-8773-7426a5ac8122",
      "demands": 10,
      "eventId": "HPCI-A-1",
      "failureMode": ""
    },
    {
      "id": "229f8d1c-197c-4929-a587-d829c70df88f",
      "name": "HPCIポンプ(B)",
      "tags": [
        "ECCS",
        "ポンプ"
      ],
      "failureRate": 0.001,
      "repairTime": 24,
      "probability": 0.01,
      "missionTime": 24,
      "distribution": {
        "type": "lognormal",
        "mean": 0.00003,
        "errorFactor": 3
      },
      "source": "NUREG/CR-6928",
      "memo": "ECCSポンプ起動失敗",
      "parameterId": "79a2529c-dee4-4d7f-b402-5c9e3c17dea4",
      "failureType": "demand",
      "position": {
        "x": -140,
        "y": 1150
      },
      "seismicFragilityId": "0a28cd4b-490a-41cb-8773-7426a5ac8122",
      "demands": 10,
      "eventId": "HPCI-B-1",
      "failureMode": ""
    },
    {
      "id": "d6c38cb0-83bf-4d53-afd2-2de36256b69c",
      "name": "HPCIポンプ(B)_2",
      "tags": [
        "ECCS",
        "ポンプ"
      ],
      "failureRate": 0.0003,
      "repairTime": 24,
      "probability": 0.0072,
      "missionTime": 24,
      "distribution": {
        "type": "lognormal",
        "mean": 0.00003,
        "errorFactor": 3
      },
      "source": "NUREG/CR-6928",
      "memo": "ECCSポンプ起動失敗",
      "parameterId": "038628ae-6af9-41ee-945e-fedaf7776c86",
      "failureType": "time",
      "position": {
        "x": 100,
        "y": 1150
      },
      "seismicFragilityId": "0a28cd4b-490a-41cb-8773-7426a5ac8122",
      "demands": 10,
      "eventId": "HPCI-B-2",
      "failureMode": ""
    },
    {
      "id": "c570a960-ff7e-48e1-ba12-01de3da9b269",
      "name": "HPCI-MOV-A",
      "tags": [
        "弁",
        "MOV"
      ],
      "failureRate": 0.001,
      "probability": 0.001,
      "distribution": {
        "type": "lognormal",
        "mean": 0.0005,
        "errorFactor": 5
      },
      "source": "NUREG/CR-6928",
      "memo": "電動弁開放失敗",
      "position": {
        "x": -620,
        "y": 1150
      },
      "eventId": "HPCI-A-VALVE-1",
      "parameterId": "64054ba9-df48-4046-b1eb-4d57969485ad",
      "failureType": "demand"
    },
    {
      "id": "ecff3c51-d27d-4e47-a257-a413da92944d",
      "name": "HPCI-MOV-B",
      "tags": [
        "弁",
        "MOV"
      ],
      "failureRate": 0.001,
      "probability": 0.001,
      "distribution": {
        "type": "lognormal",
        "mean": 0.0005,
        "errorFactor": 5
      },
      "source": "NUREG/CR-6928",
      "memo": "電動弁開放失敗",
      "position": {
        "x": 340,
        "y": 1150
      },
      "eventId": "HPCI-B-VALVE-1",
      "parameterId": "64054ba9-df48-4046-b1eb-4d57969485ad",
      "failureType": "demand"
    },
    {
      "id": "36a8be06-1a16-450f-ac10-bb808a6aed49",
      "name": "HPCI-MOV-C",
      "eventType": "basicEvent",
      "tags": [],
      "failureType": "demand",
      "failureRate": 0.001,
      "probability": 0.001,
      "missionTime": 24,
      "demands": 1,
      "distribution": {
        "type": "lognormal",
        "mean": 0.0001,
        "errorFactor": 3
      },
      "source": "",
      "memo": "",
      "position": {
        "x": -140,
        "y": 710
      },
      "seismicFragilityId": "0a28cd4b-490a-41cb-8773-7426a5ac8122",
      "eventId": "HPCI-MOV-1",
      "parameterId": "64054ba9-df48-4046-b1eb-4d57969485ad"
    },
    {
      "id": "7915764c-8f54-49d2-a453-c26f10a1986f",
      "name": "HPCI-MOV-D",
      "eventType": "basicEvent",
      "tags": [],
      "failureType": "time",
      "failureRate": 0.0001,
      "probability": 0.0024000000000000002,
      "missionTime": 24,
      "demands": 1,
      "distribution": {
        "type": "lognormal",
        "mean": 0.0001,
        "errorFactor": 3
      },
      "source": "",
      "memo": "",
      "position": {
        "x": 100,
        "y": 710
      },
      "eventId": "HPCI-MOV-2",
      "parameterId": "390767d9-516e-4ea0-8437-ee7afd25c051"
    },
    {
      "id": "9eed4687-4781-4e84-9a26-4fef2fb87838",
      "name": "DG復旧",
      "tags": [],
      "failureType": "demand",
      "failureRate": 1,
      "probability": 1,
      "missionTime": 24,
      "demands": 1,
      "distribution": {
        "type": "point"
      },
      "source": "",
      "memo": "",
      "position": {
        "x": 1060,
        "y": 1150
      },
      "eventType": "houseEvent",
      "eventId": "DG-RECOVERY"
    },
    {
      "id": "8d49c3a7-fc57-4d69-8739-09bb4ef3ae88",
      "name": "LPI-TRAIN-FAIL",
      "tags": [
        "LPI",
        "注入"
      ],
      "failureRate": 0.01,
      "probability": 0.24,
      "distribution": {
        "type": "lognormal",
        "mean": 0.0001,
        "errorFactor": 3
      },
      "source": "NUREG/CR-6928",
      "memo": "低圧注入系トレイン故障",
      "position": {
        "x": 820,
        "y": 710
      },
      "eventId": "LPI-TRAIN-FAIL"
    }
  ],
  "houseEvents": [],
  "ccfGroups": [
    {
      "id": "9f9884e9-3c95-4308-9665-73234788ba49",
      "name": "新規CCFグループ",
      "model": "mgl",
      "members": [],
      "parameters": {
        "beta": 0.1,
        "gamma": 0.5
      }
    },
    {
      "id": "03e92620-1640-46cb-93d0-4d5a9d605b50",
      "name": "HPCIポンプ継続運転",
      "model": "beta_factor",
      "members": [
        "60dcf419-5457-41a6-8edd-6e974fa94a50",
        "4ce351c0-2ba8-47d9-98f7-bfffde1cc594",
        "45c25367-586d-4b11-be98-b08438f2359a",
        "d6c38cb0-83bf-4d53-afd2-2de36256b69c"
      ],
      "parameters": {
        "beta": 0.1
      }
    }
  ],
  "initiatingEvents": [
    {
      "id": "898e9e47-586a-4132-ac5d-e88cdd2d7da9",
      "name": "TEST p=1",
      "frequency": 1,
      "description": "小破断LOCA",
      "code": "TEST",
      "linkedFaultTreeId": ""
    },
    {
      "id": "IE_1778255565935",
      "name": "小LOCA",
      "code": "SLOCA",
      "frequency": 0.5,
      "linkedFaultTreeId": ""
    }
  ],
  "endStates": [
    {
      "id": "16647e4a-e88e-4680-9379-824529ea06cf",
      "name": "OK",
      "category": "success",
      "description": "正常",
      "color": "#00D68F",
      "categories": [
        "success"
      ]
    },
    {
      "id": "1b3d73da-bc82-4715-a610-54d83a8256c5",
      "name": "TQUX",
      "category": "core_damage",
      "description": "過渡事象+給水喪失+高圧注入失敗+減圧失敗",
      "color": "#FF4757",
      "categories": [
        "core_damage"
      ]
    },
    {
      "id": "89df86f8-f1ef-4425-8cbf-e90c58182d45",
      "name": "TQUV",
      "category": "core_damage",
      "description": "過渡事象+給水喪失+高圧注入成功+格納容器冷却失敗",
      "color": "#FF6B81",
      "categories": [
        "core_damage"
      ]
    },
    {
      "id": "4eca73ec-1c3f-4782-9432-099981b92367",
      "name": "SBO-CD",
      "category": "core_damage",
      "description": "全電源喪失→炉心損傷",
      "color": "#FFA502",
      "categories": [
        "core_damage"
      ]
    },
    {
      "id": "5191534a-77b3-445a-b754-3c07e16824fb",
      "name": "RBR",
      "categories": [
        "大規模早期放出",
        "core_damage"
      ],
      "color": "#FF4757"
    },
    {
      "id": "a6bd0ca8-aa12-48f9-a692-e1b2e3443ae4",
      "name": "TW",
      "categories": [
        "core_damage",
        "大規模早期放出"
      ],
      "color": "#FF4757"
    },
    {
      "id": "182706df-5681-4721-8c8c-99911fa5b71b",
      "name": "暫定",
      "categories": [
        "core_damage"
      ],
      "color": "#FF4757"
    }
  ],
  "parameters": [
    {
      "id": "79a2529c-dee4-4d7f-b402-5c9e3c17dea4",
      "name": "ポンプ起動失敗",
      "failureType": "demand",
      "value": 0.003,
      "source": "NUREGxxxx",
      "description": ""
    },
    {
      "id": "038628ae-6af9-41ee-945e-fedaf7776c86",
      "name": "ポンプ継続運転失敗",
      "failureType": "time",
      "value": 0.0003,
      "source": "NUREGxxxx",
      "description": ""
    },
    {
      "id": "64054ba9-df48-4046-b1eb-4d57969485ad",
      "name": "弁開失敗",
      "failureType": "demand",
      "value": 0.001,
      "source": "NUREGxxxx",
      "description": ""
    },
    {
      "id": "390767d9-516e-4ea0-8437-ee7afd25c051",
      "name": "弁誤閉",
      "failureType": "time",
      "value": 0.0001,
      "source": "",
      "description": ""
    }
  ],
  "seismicHazards": [],
  "seismicFragilities": [
    {
      "id": "0a28cd4b-490a-41cb-8773-7426a5ac8122",
      "name": "ポンプ",
      "am": 1.1,
      "betaR": 0.2,
      "betaU": 0.2,
      "type": "lognormal",
      "points": [
        {
          "pga": 0.1,
          "probability": 0.1
        },
        {
          "pga": 0.5,
          "probability": 0.5
        },
        {
          "pga": 1,
          "probability": 0.9
        }
      ]
    },
    {
      "id": "d21dff14-2252-4a37-b98d-3fe5a5fd026b",
      "name": "手動弁A",
      "am": 2,
      "betaR": 0.2,
      "betaU": 0.3,
      "type": "lognormal",
      "points": []
    },
    {
      "id": "0125d52e-688a-490d-b04a-8be952af8f97",
      "name": "離散値フラジリティ",
      "type": "discrete",
      "am": 1,
      "betaR": 0.2,
      "betaU": 0.2,
      "points": [
        {
          "pga": 0,
          "probability": 0
        },
        {
          "pga": 1,
          "probability": 0.01
        },
        {
          "pga": 1.001,
          "probability": 1
        },
        {
          "pga": 2,
          "probability": 1
        }
      ]
    }
  ],
  "seismicSettings": {
    "hazardCurveId": "dccedd97-39c7-4e6c-b578-9ec91e27a846",
    "minPGA": 0.05,
    "maxPGA": 2,
    "intervals": 20,
    "selectedETIds": [
      "d0654510-8e04-4d58-a673-1e7cd95950c5",
      "315210c7-324f-4a5c-93b5-ca6b04376d42"
    ],
    "uncertaintyEnabled": true
  },
  "quantificationSettings": {
    "cutOff": 1e-20,
    "bddCutOff": 1e-20,
    "enablePruning": false,
    "approximation": [
      "bdd_exact",
      "mcub",
      "rare_event"
    ],
    "monteCarloSamples": 10000,
    "useLHS": true,
    "runUncertainty": false,
    "maxCutsets": 100000
  },
  "flagGroups": [
    {
      "id": "1b66d3a9-0bb7-4f3d-8758-d80e7cd0e659",
      "name": "新規フラググループ",
      "items": [
        {
          "eventId": "LPI-TRAIN-FAIL",
          "state": false
        }
      ]
    }
  ],
  "recoveryGroups": [
    {
      "id": "85c52f17-4f1f-4885-b43a-63c48d8e6d88",
      "name": "新規リカバリーグループ",
      "description": "新規追加されたグループです。",
      "rules": [
        {
          "id": "9d466ab8-63cf-47f3-a085-83a58b768441",
          "name": "新規リカバリールール",
          "condition": [
            "7f7ac691-a37f-4e1f-b20f-acaf0e1aa643",
            "8e6b8bfd-2904-4269-82fe-04de24131bc9"
          ],
          "action": "add",
          "priority": 10
        },
        {
          "id": "e329ae2e-46cf-423d-a12d-187975a09932",
          "name": "新規リカバリールール",
          "condition": [
            "LPI-TRAIN-FAIL"
          ],
          "action": "add",
          "priority": 10
        }
      ]
    },
    {
      "id": "1e786fc5-1b98-412e-b7d8-465f8473546b",
      "name": "新規リカバリーグループ",
      "description": "新規追加されたグループです。",
      "rules": []
    }
  ],
  "activeRecoveryGroupId": "85c52f17-4f1f-4885-b43a-63c48d8e6d88",
  "activeFlagGroupId": "1b66d3a9-0bb7-4f3d-8758-d80e7cd0e659",
  "recoveryRules": []
};
}

// ===== Store Interface =====
interface ModelState {
  model: PRAModel;
  selectedFaultTreeId: string | null;
  selectedEventTreeId: string | null;
  isDirty: boolean;
  past: PRAModel[];
  future: PRAModel[];

  // Actions
  setModel: (model: PRAModel) => void;
  selectFaultTree: (id: string | null) => void;
  selectEventTree: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  updateBasicEvent: (event: BasicEvent) => void;
  updateBasicEventIdGlobal: (oldEventId: string, newEventId: string, syncWithEvent?: BasicEvent) => void;
  cloneAndUpdateBasicEventLocal: (
    faultTreeId: string,
    parentGateId: string,
    oldEvent: BasicEvent,
    newEventId: string,
    syncWithEvent?: BasicEvent
  ) => string;
  addBasicEvent: (event: BasicEvent) => void;
  removeBasicEvent: (id: string) => void;
  addParameter: (param: Parameter) => void;
  updateParameter: (param: Parameter) => void;
  removeParameter: (id: string) => void;
  addCCFGroup: (group: CCFGroup) => void;
  updateCCFGroup: (group: CCFGroup) => void;
  removeCCFGroup: (id: string) => void;
  addGate: (faultTreeId: string, gate: Gate) => void;
  updateGate: (faultTreeId: string, gate: Gate) => void;
  removeGate: (faultTreeId: string, gateId: string) => void;
  addEndState: (endState: EndState) => void;
  updateEndState: (endState: EndState) => void;
  removeEndState: (id: string) => void;
  toggleGateCollapse: (faultTreeId: string, gateId: string) => void;
  autoLayout: (faultTreeId: string) => void;
  addFaultTree: (name: string) => void;
  removeFaultTree: (id: string) => void;
  updateFaultTree: (id: string, updates: Partial<FaultTree>) => void;
  addEventTree: (name: string, initiatingEventId: string) => void;
  removeEventTree: (id: string) => void;
  updateEventTree: (id: string, updates: Partial<EventTree>) => void;
  addFunctionalEvent: (eventTreeId: string, event: FunctionalEvent, index?: number) => void;
  updateFunctionalEvent: (eventTreeId: string, eventId: string, updates: Partial<FunctionalEvent>) => void;
  removeFunctionalEvent: (eventTreeId: string, eventId: string) => void;
  branchSequence: (eventTreeId: string, sequenceId: string, functionalEventId: string) => void;
  unbranchSequence: (eventTreeId: string, sequenceId: string, functionalEventId: string) => void;
  updateSequence: (eventTreeId: string, sequenceId: string, updates: Partial<Sequence>) => void;
  addInitiatingEvent: (ie: InitiatingEvent) => void;
  updateInitiatingEvent: (id: string, updates: Partial<InitiatingEvent>) => void;
  removeInitiatingEvent: (id: string) => void;
  addChildToGate: (faultTreeId: string, gateId: string, childId: string) => void;
  removeChildFromGate: (faultTreeId: string, gateId: string, childId: string) => void;
  addSeismicHazard: (hazard: SeismicHazardCurve) => void;
  updateSeismicHazard: (hazard: SeismicHazardCurve) => void;
  removeSeismicHazard: (id: string) => void;
  addSeismicFragility: (fragility: SeismicFragility) => void;
  updateSeismicFragility: (fragility: SeismicFragility) => void;
  removeSeismicFragility: (id: string) => void;
  updateSeismicSettings: (settings: Partial<SeismicSettings>) => void;
  updateQuantificationSettings: (settings: Partial<GlobalQuantificationSettings>) => void;
  moveGateChild: (faultTreeId: string, gateId: string, childId: string, direction: 'left' | 'right') => void;
  pushHistory: () => void;
  saveToLocalStorage: () => Promise<void>;
  loadFromLocalStorage: () => Promise<boolean>;
  convertToSubtree: (faultTreeId: string, gateId: string) => void;
  
  // Flag Management
  addFlagGroup: (group: any) => void;
  updateFlagGroup: (id: string, updates: any) => void;
  removeFlagGroup: (id: string) => void;
  
  // Recovery Management
  addRecoveryGroup: (group: RecoveryGroup) => void;
  updateRecoveryGroup: (id: string, updates: Partial<RecoveryGroup>) => void;
  removeRecoveryGroup: (id: string) => void;
  addRecoveryRule: (rule: RecoveryRule) => void;
  updateRecoveryRule: (id: string, updates: Partial<RecoveryRule>) => void;
  removeRecoveryRule: (id: string) => void;
}

export const useModelStore = create<ModelState>((set, get) => ({
  model: createDefaultModel(),
  selectedFaultTreeId: null,
  selectedEventTreeId: null,
  isDirty: false,
  past: [],
  future: [],
  setModel: (model) => {
    const updatedModel = { ...model };
    if (updatedModel.quantificationSettings) {
      // Force update legacy default values to new system standards if they haven't changed
      if (updatedModel.quantificationSettings.cutOff === 1e-10 || 
          updatedModel.quantificationSettings.cutOff === 1e-9 || 
          updatedModel.quantificationSettings.cutOff === 1 || // Catch invalid 1.0 default
          !updatedModel.quantificationSettings.cutOff) {
        updatedModel.quantificationSettings.cutOff = 1e-20;
      }
      // Convert legacy single-string approximation into user's desired full array default
      const currentAppx = updatedModel.quantificationSettings.approximation;
      if (typeof currentAppx === 'string' && currentAppx === 'bdd_exact') {
        updatedModel.quantificationSettings.approximation = ['bdd_exact', 'mcub', 'rare_event'];
        // Also pair this with default UI correction for uncertainty if strictly following legacy path
        updatedModel.quantificationSettings.runUncertainty = false;
      } else if (!Array.isArray(currentAppx)) {
        // Catch all other edge cases
        updatedModel.quantificationSettings.approximation = ['bdd_exact', 'mcub', 'rare_event'];
      }

      if (updatedModel.quantificationSettings.maxCutsets === undefined) {
        updatedModel.quantificationSettings.maxCutsets = 100000;
      }

      if (updatedModel.quantificationSettings.bddCutOff === undefined || updatedModel.quantificationSettings.bddCutOff === 1) {
        updatedModel.quantificationSettings.bddCutOff = 1e-20;
      }
      // Force update legacy enablePruning = true once to respect the new default-off policy for loaded models as well.
      // UPGRADED v8: Directly commit the sanitized state to individual project storage to prevent synced state rollbacks.
      if (updatedModel.quantificationSettings.enablePruning === undefined || 
          (typeof window !== 'undefined' && !window.localStorage.getItem('quantica-risk-pruning-v8-storage-setmodel-sync'))) {
        updatedModel.quantificationSettings.enablePruning = false;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('quantica-risk-pruning-v8-storage-setmodel-sync', 'done');
          // Persist changes immediately down to the persistent layer to fix corruption
          try {
            localStorage.setItem(`pra_project_model_${updatedModel.id}`, JSON.stringify(updatedModel));
          } catch (_) {}
        }
      }
    } else {
      updatedModel.quantificationSettings = {
        cutOff: 1e-20,
        bddCutOff: 1e-20,
        enablePruning: false,
        approximation: ['bdd_exact', 'mcub', 'rare_event'],
        monteCarloSamples: 10000,
        useLHS: true,
        runUncertainty: false,
        maxCutsets: 100000
      };
    }
    set({ 
      model: updatedModel, 
      isDirty: false, 
      past: [], 
      future: [],
      selectedFaultTreeId: (updatedModel.faultTrees?.some(ft => ft.id === get().selectedFaultTreeId)) 
        ? get().selectedFaultTreeId 
        : (updatedModel.faultTrees?.[0]?.id ?? null),
      selectedEventTreeId: (updatedModel.eventTrees?.some(et => et.id === get().selectedEventTreeId))
        ? get().selectedEventTreeId
        : (updatedModel.eventTrees?.[0]?.id ?? null)
    });
  },

  selectFaultTree: (id) => set({ selectedFaultTreeId: id }),
  selectEventTree: (id) => set({ selectedEventTreeId: id }),

  // History Helper
  pushHistory: () => {
    const { model, past } = get();
    // Keep last 50 states
    const newPast = [...past, JSON.parse(JSON.stringify(model))].slice(-50);
    set({ past: newPast, future: [] });
  },

  undo: () => {
    const { model, past, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    set({
      model: previous,
      past: newPast,
      future: [JSON.parse(JSON.stringify(model)), ...future].slice(0, 50),
      isDirty: true
    });
  },

  redo: () => {
    const { model, past, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    set({
      model: next,
      past: [...past, JSON.parse(JSON.stringify(model))].slice(-50),
      future: newFuture,
      isDirty: true
    });
  },

  updateBasicEvent: (event) => {
    get().pushHistory();
    
    const isForceSync = (event as any).__force_sync_others__ !== false;
    
    const cleanEvent = { ...event };
    delete (cleanEvent as any).__force_sync_others__;

    set((state) => {
      const basicEvents = state.model.basicEvents.map((e) => {
        if (e.id === cleanEvent.id) {
          return cleanEvent;
        }
        if (isForceSync && cleanEvent.eventId && e.eventId === cleanEvent.eventId) {
          return {
            ...e,
            name: cleanEvent.name,
            tags: cleanEvent.tags,
            failureType: cleanEvent.failureType,
            failureRate: cleanEvent.failureRate,
            repairTime: cleanEvent.repairTime,
            probability: cleanEvent.probability,
            missionTime: cleanEvent.missionTime,
            demands: cleanEvent.demands,
            distribution: JSON.parse(JSON.stringify(cleanEvent.distribution)),
            parameterId: cleanEvent.parameterId,
            source: cleanEvent.source,
            memo: cleanEvent.memo,
            seismicFragilityId: cleanEvent.seismicFragilityId,
          };
        }
        return e;
      });

      return {
        model: {
          ...state.model,
          basicEvents,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true
      };
    });
  },

  updateBasicEventIdGlobal: (oldEventId, newEventId, syncWithEvent) => {
    get().pushHistory();
    set((state) => {
      const basicEvents = state.model.basicEvents.map((e) => {
        if (e.eventId && e.eventId.trim().toLowerCase() === oldEventId.trim().toLowerCase()) {
          if (syncWithEvent) {
            return {
              ...e,
              eventId: newEventId,
              name: syncWithEvent.name,
              tags: syncWithEvent.tags || [],
              failureType: syncWithEvent.failureType,
              failureRate: syncWithEvent.failureRate,
              repairTime: syncWithEvent.repairTime,
              probability: syncWithEvent.probability,
              missionTime: syncWithEvent.missionTime,
              demands: syncWithEvent.demands,
              distribution: JSON.parse(JSON.stringify(syncWithEvent.distribution)),
              parameterId: syncWithEvent.parameterId,
              source: syncWithEvent.source || '',
              memo: syncWithEvent.memo || '',
              seismicFragilityId: syncWithEvent.seismicFragilityId,
            };
          } else {
            return {
              ...e,
              eventId: newEventId,
            };
          }
        }
        return e;
      });

      return {
        model: {
          ...state.model,
          basicEvents,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true
      };
    });
  },

  cloneAndUpdateBasicEventLocal: (faultTreeId, parentGateId, oldEvent, newEventId, syncWithEvent) => {
    get().pushHistory();
    const newUUID = uuidv4();
    
    // 1. 新基本事象オブジェクトをクローン作成
    const baseEvent = syncWithEvent || oldEvent;
    const clonedEvent: BasicEvent = {
      ...baseEvent,
      id: newUUID,
      eventId: newEventId,
      position: oldEvent.position ? { x: oldEvent.position.x, y: oldEvent.position.y } : { x: 0, y: 0 }
    };

    set((state) => {
      // 2. basicEvents リストに新規追加
      let basicEvents = [...state.model.basicEvents, clonedEvent];

      // 3. 親ゲートの children 内の oldEvent.id を newUUID に差し替える
      const faultTrees = state.model.faultTrees.map((ft) => {
        if (ft.id === faultTreeId) {
          return {
            ...ft,
            gates: ft.gates.map((g) => {
              if (g.id === parentGateId) {
                return {
                  ...g,
                  children: g.children.map((cid) => (cid === oldEvent.id ? newUUID : cid))
                };
              }
              return g;
            })
          };
        }
        return ft;
      });

      // 4. 差し替え後、古い基事象がどのゲートからも参照されなくなった場合は削除する
      //    （非共有の基事象をリネームした場合に孤立ノードが残るのを防止）
      let oldEventStillReferenced = false;
      for (const ft of faultTrees) {
        for (const gate of ft.gates) {
          if (gate.children.includes(oldEvent.id)) {
            oldEventStillReferenced = true;
            break;
          }
        }
        if (oldEventStillReferenced) break;
      }
      if (!oldEventStillReferenced) {
        basicEvents = basicEvents.filter(e => e.id !== oldEvent.id);
      }

      return {
        model: {
          ...state.model,
          basicEvents,
          faultTrees,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true
      };
    });

    return newUUID;
  },

  addBasicEvent: (event) => {
    get().pushHistory();
    set((state) => {
      return {
        model: {
          ...state.model,
          basicEvents: [...state.model.basicEvents, event],
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });
  },

  removeBasicEvent: (id) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        basicEvents: state.model.basicEvents.filter((e) => e.id !== id),
        // Clean up references in all gates across all fault trees
        faultTrees: state.model.faultTrees.map((ft) => ({
          ...ft,
          gates: ft.gates.map((g) => ({
            ...g,
            children: g.children.filter(cid => cid !== id)
          }))
        })),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addParameter: (param) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        parameters: [...state.model.parameters, param],
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  updateParameter: (param) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        parameters: state.model.parameters.map((p) => p.id === param.id ? param : p),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  removeParameter: (id) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        parameters: state.model.parameters.filter((p) => p.id !== id),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addCCFGroup: (group) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        ccfGroups: [...state.model.ccfGroups, group],
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  updateCCFGroup: (group) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        ccfGroups: state.model.ccfGroups.map((g) => g.id === group.id ? group : g),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  removeCCFGroup: (id) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        ccfGroups: state.model.ccfGroups.filter((g) => g.id !== id),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addGate: (faultTreeId, gate) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: state.model.faultTrees.map((ft) =>
          ft.id === faultTreeId ? { ...ft, gates: [...ft.gates, gate] } : ft
        ),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  updateGate: (faultTreeId, gate) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: state.model.faultTrees.map((ft) =>
          ft.id === faultTreeId
            ? { ...ft, gates: ft.gates.map((g) => g.id === gate.id ? gate : g) }
            : ft
        ),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  removeGate: (faultTreeId, gateId) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: state.model.faultTrees.map((ft) => ({
          ...ft,
          // Remove the gate itself if it's in this FT
          gates: ft.gates
            .filter((g) => g.id !== gateId)
            // Also remove any references to this gate from other gates' children
            .map((g) => ({
              ...g,
              children: g.children.filter(cid => cid !== gateId)
            }))
        })),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addEndState: (endState) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        endStates: [...state.model.endStates, endState],
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  updateEndState: (endState) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        endStates: state.model.endStates.map((e) => e.id === endState.id ? endState : e),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  removeEndState: (id) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        endStates: state.model.endStates.filter((e) => e.id !== id),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  toggleGateCollapse: (faultTreeId, gateId) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: state.model.faultTrees.map((ft) =>
          ft.id === faultTreeId
            ? {
              ...ft,
              gates: ft.gates.map((g) =>
                g.id === gateId ? { ...g, collapsed: !g.collapsed } : g
              ),
            }
            : ft
        ),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addChildToGate: (faultTreeId, gateId, childId) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: state.model.faultTrees.map((ft) =>
          ft.id === faultTreeId
            ? {
              ...ft,
              gates: ft.gates.map((g) =>
                g.id === gateId
                  ? { ...g, children: [...new Set([...g.children, childId])] }
                  : g
              ),
            }
            : ft
        ),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  removeChildFromGate: (faultTreeId, gateId, childId) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: state.model.faultTrees.map((ft) =>
          ft.id === faultTreeId
            ? {
              ...ft,
              gates: ft.gates.map((g) =>
                g.id === gateId
                  ? { ...g, children: g.children.filter(id => id !== childId) }
                  : g
              ),
            }
            : ft
        ),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  autoLayout: (faultTreeId) => {
    get().pushHistory();
    const { model } = get();
    const ft = model.faultTrees.find(f => f.id === faultTreeId);
    if (!ft) return;

    // 1. Build an absolute index of all current nodes
    const nodesMap = new Map<string, any>();
    ft.gates.forEach(g => nodesMap.set(g.id, { ...g, type: 'gate' }));
    model.basicEvents.forEach(be => nodesMap.set(be.id, { ...be, type: 'basicEvent' }));

    // 2. Determine true roots (forest layout) by collecting all child IDs
    const allChildIds = new Set<string>();
    ft.gates.forEach(g => g.children.forEach(cid => allChildIds.add(cid)));

    // All gates that do not have a parent gate (orphans and the top node)
    const roots = ft.gates.filter(g => !allChildIds.has(g.id));
    
    // Prioritize top event to be the leftmost/centered principal root
    const mainRootIndex = roots.findIndex(r => r.id === ft.topGateId);
    if (mainRootIndex > -1) {
      const [main] = roots.splice(mainRootIndex, 1);
      roots.unshift(main);
    }

    // 3. Build strict D3 hierarchy using unique traversal keys to accurately preserve spacing and widths.
    let globalCounter = 0;
    const buildHierarchy = (nodeId: string, parentPath = ''): any => {
      const node = nodesMap.get(nodeId);
      if (!node) return null;

      const currentPath = parentPath ? `${parentPath}->${nodeId}` : nodeId;
      const childrenIds = node.type === 'gate' ? node.children : [];

      return {
        id: nodeId,
        uniqueId: `${currentPath}-${globalCounter++}`, // Crucial for correct duplicate width math in d3.tree
        name: node.name,
        type: node.type,
        children: childrenIds.map((cid: string) => buildHierarchy(cid, currentPath)).filter(Boolean)
      };
    };

    // 4. Construct super root to seamlessly layout detached sub-trees horizontally without overlaps.
    const superRootData = {
      id: 'SUPER_ROOT',
      uniqueId: 'SUPER_ROOT',
      name: 'SUPER_ROOT',
      type: 'dummy',
      children: roots.map(r => buildHierarchy(r.id)).filter(Boolean)
    };

    const rootNode = d3.hierarchy(superRootData);

    // 5. Configure D3 tree spacing layout
    const nodeWidth = 240;  // Generous horizontal spacing between nodes
    const nodeHeight = 220; // Generous vertical spacing depth
    const treeLayout = d3.tree<any>().nodeSize([nodeWidth, nodeHeight]);
    treeLayout(rootNode);

    // 6. Record optimal coordinate maps
    const newGatePositions = new Map<string, { x: number, y: number }>();
    const newBEPositions = new Map<string, { x: number, y: number }>();

    rootNode.descendants().forEach((d: any) => {
      if (d.data.id === 'SUPER_ROOT') return;

      // Apply layout base offset and extract calculated points
      const finalPos = { x: d.x + 400, y: d.y + 50 };
      const type = d.data.type;

      if (type === 'gate') {
        if (!newGatePositions.has(d.data.id)) {
          newGatePositions.set(d.data.id, finalPos);
        }
      } else if (type === 'basicEvent') {
        newBEPositions.set(d.data.id, finalPos);
      }
    });

    // 7. Synchronize to model store
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: state.model.faultTrees.map((f) =>
          f.id === faultTreeId
            ? {
              ...f,
              gates: f.gates.map((g) => ({
                ...g,
                position: newGatePositions.get(g.id) || g.position
              }))
            }
            : f
        ),
        basicEvents: state.model.basicEvents.map((be) => ({
          ...be,
          position: newBEPositions.get(be.id) || (be as any).position || { x: 0, y: 0 }
        })),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addFaultTree: (name) => {
    get().pushHistory();
    const { model } = get();
    const newFTId = uuidv4();
    const topGateId = uuidv4();

    // Ensure unique name
    let uniqueName = name;
    let counter = 1;
    const existingNames = new Set(model.faultTrees?.map(ft => ft.name) || []);
    while (existingNames.has(uniqueName)) {
      uniqueName = `${name} (${counter++})`;
    }

    const newFT: FaultTree = {
      id: newFTId,
      name: uniqueName,
      topGateId,
      gates: [
        {
          id: topGateId,
          name: 'TOP EVENT',
          type: 'OR',
          children: [],
          position: { x: 400, y: 50 }
        }
      ]
    };
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: [...(state.model.faultTrees || []), newFT],
        updatedAt: new Date().toISOString(),
      },
      selectedFaultTreeId: newFTId,
      isDirty: true,
    }));
  },

  removeFaultTree: (id) => {
    get().pushHistory();
    set((state) => {
      const newFTs = (state.model.faultTrees || []).filter(ft => ft.id !== id);
      return {
        model: {
          ...state.model,
          faultTrees: newFTs,
          updatedAt: new Date().toISOString(),
        },
        selectedFaultTreeId: state.selectedFaultTreeId === id ? (newFTs[0]?.id || null) : state.selectedFaultTreeId,
        isDirty: true,
      };
    });
  },

  updateFaultTree: (id, updates) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: (state.model.faultTrees || []).map(ft => ft.id === id ? { ...ft, ...updates } : ft),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addEventTree: (name, initiatingEventId) => {
    get().pushHistory();
    const { model } = get();
    const newETId = uuidv4();

    let uniqueName = name;
    let counter = 1;
    const existingNames = new Set(model.eventTrees?.map(et => et.name) || []);
    while (existingNames.has(uniqueName)) {
      uniqueName = `${name} (${counter++})`;
    }

    const newET: EventTree = {
      id: newETId,
      name: uniqueName,
      initiatingEventId,
      functionalEvents: [],
      sequences: [
        {
          id: uuidv4(),
          path: [],
          endStateId: model.endStates?.[0]?.id || ''
        }
      ]
    };

    set((state) => ({
      model: {
        ...state.model,
        eventTrees: [...(state.model.eventTrees || []), newET],
        updatedAt: new Date().toISOString(),
      },
      selectedEventTreeId: newETId,
      isDirty: true,
    }));
  },

  removeEventTree: (id) => {
    get().pushHistory();
    set((state) => {
      const remaining = state.model.eventTrees?.filter((et) => et.id !== id) || [];
      return {
        model: {
          ...state.model,
          eventTrees: remaining,
          updatedAt: new Date().toISOString(),
        },
        selectedEventTreeId: state.selectedEventTreeId === id
          ? (remaining.length > 0 ? remaining[0].id : null)
          : state.selectedEventTreeId,
        isDirty: true,
      };
    });
  },

  updateEventTree: (id, updates) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        eventTrees: (state.model.eventTrees || []).map((et) =>
          et.id === id ? { ...et, ...updates } : et
        ),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addFunctionalEvent: (etId, event, index) => {
    get().pushHistory();
    set((state) => {
      const ets = state.model.eventTrees || [];
      const newEts = ets.map((et) => {
        if (et.id === etId) {
          const newFEList = [...et.functionalEvents];
          const newFE = {
            ...event,
            code: event.code || event.name.slice(0, 3).toUpperCase()
          };
          if (typeof index === 'number') {
            newFEList.splice(index, 0, newFE);
          } else {
            newFEList.push(newFE);
          }
          return { ...et, functionalEvents: newFEList };
        }
        return et;
      });
      return {
        model: { ...state.model, eventTrees: newEts, updatedAt: new Date().toISOString() },
        isDirty: true,
      };
    });
  },

  updateFunctionalEvent: (eventTreeId, eventId, updates) => {
    get().pushHistory();
    set((state) => {
      const et = state.model.eventTrees?.find(e => e.id === eventTreeId);
      if (!et) return state;

      const ie = state.model.initiatingEvents?.find(i => i.id === et.initiatingEventId);
      const ieCode = ie?.code || 'IE';

      const updatedETs = (state.model.eventTrees || []).map((e) => {
        if (e.id !== eventTreeId) return e;

        const updatedFEs = e.functionalEvents.map((fe) =>
          fe.id === eventId ? { ...fe, ...updates } : fe
        );

        const newET = { ...e, functionalEvents: updatedFEs };

        // Renumber if code/name changed
        if (updates.code || updates.name) {
          newET.sequences = newET.sequences.map((seq, index) => ({
            ...seq,
            name: `${ieCode}-${(index + 1).toString().padStart(2, '0')}`
          }));
        }

        return newET;
      });

      return {
        model: {
          ...state.model,
          eventTrees: updatedETs,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });
  },

  removeFunctionalEvent: (eventTreeId, eventId) => {
    get().pushHistory();
    set((state) => {
      return {
        model: {
          ...state.model,
          eventTrees: (state.model.eventTrees || []).map((et) => {
            if (et.id !== eventTreeId) return et;

            // Remove the FE
            const newFEs = et.functionalEvents.filter(fe => fe.id !== eventId);

            // 1. Remove the FE decisions
            const filteredSequences = et.sequences.map(seq => ({
              ...seq,
              path: seq.path.filter(p => p.functionalEventId !== eventId)
            }));

            // 2. Merge duplicate sequences (sequences with same path)
            // We keep the first one found for each unique path
            const seenPaths = new Set<string>();
            const mergedSequences: Sequence[] = [];

            filteredSequences.forEach(seq => {
              const pathKey = seq.path.map(p => `${p.functionalEventId}:${p.branchId}`).join('|');
              if (!seenPaths.has(pathKey)) {
                seenPaths.add(pathKey);
                mergedSequences.push(seq);
              }
            });

            // 3. Renumber sequences
            const ie = state.model.initiatingEvents?.find(i => i.id === et.initiatingEventId);
            const ieCode = ie?.code || 'IE';
            const finalSequences = mergedSequences.map((seq, index) => ({
              ...seq,
              name: `${ieCode}-${(index + 1).toString().padStart(2, '0')}`
            }));

            return {
              ...et,
              functionalEvents: newFEs,
              sequences: finalSequences
            };
          }),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });
  },

  branchSequence: (eventTreeId, sequenceId, functionalEventId) => {
    get().pushHistory();
    set((state) => {
      const et = state.model.eventTrees?.find(e => e.id === eventTreeId);
      if (!et) return state;

      const fe = et.functionalEvents.find(f => f.id === functionalEventId);
      if (!fe || fe.branches.length === 0) return state;

      const seqIndex = et.sequences.findIndex(s => s.id === sequenceId);
      if (seqIndex === -1) return state;

      const originalSeq = et.sequences[seqIndex];

      // Create new sequences for each branch
      const newSequences = fe.branches.map(branch => ({
        id: uuidv4(),
        path: [...originalSeq.path, { functionalEventId, branchId: branch.id }],
        endStateId: originalSeq.endStateId
      }));

      const ie = state.model.initiatingEvents?.find(i => i.id === et.initiatingEventId);
      const ieCode = ie?.code || 'IE';

      const updatedSequences = [...et.sequences];
      // Replace the original sequence with the new ones
      updatedSequences.splice(seqIndex, 1, ...newSequences);

      // Renumber all sequences in this ET
      const seenPaths = new Set<string>();
      const mergedSequences: Sequence[] = [];

      updatedSequences.forEach(seq => {
        const pathKey = seq.path.map(p => `${p.functionalEventId}:${p.branchId}`).join('|');
        if (!seenPaths.has(pathKey)) {
          seenPaths.add(pathKey);
          mergedSequences.push(seq);
        }
      });

      const renumberedSequences = mergedSequences.map((seq, index) => ({
        ...seq,
        name: `${ieCode}-${(index + 1).toString().padStart(2, '0')}`
      }));

      return {
        model: {
          ...state.model,
          eventTrees: state.model.eventTrees?.map(e =>
            e.id === eventTreeId ? { ...e, sequences: renumberedSequences } : e
          ) || [],
          updatedAt: new Date().toISOString()
        },
        isDirty: true
      };
    });
  },

  unbranchSequence: (eventTreeId, sequenceId, functionalEventId) => {
    get().pushHistory();
    set((state) => {
      const et = state.model.eventTrees?.find(e => e.id === eventTreeId);
      if (!et) return state;

      const targetSeq = et.sequences.find(s => s.id === sequenceId);
      if (!targetSeq) return state;

      // Find the path prefix up to the unbranching point
      const pathPrefix = targetSeq.path.filter(p => p.functionalEventId !== functionalEventId);

      // We need to find all sequences that share the exact same path prefix and remove them,
      // replacing them with a single sequence that bypasses this functionalEventId.
      // But wait, the sequences we want to merge might have branched *further* down!
      // Unbranching means we remove the branch decision at `functionalEventId` and ALL subsequent decisions for these sequences.
      // Actually, standard behavior: unbranching deletes all downstream logic and replaces it with a straight line to the end state.
      // Let's implement that: Find all sequences that share the same path decisions up to the functionalEventId.

      // To do this simply: a branch occurs on a specific segment. 
      // A segment is identified by the decisions made BEFORE this functionalEventId.
      // Let's get the index of the target FE in the headers to know what is "before".
      const feIndex = et.functionalEvents.findIndex(f => f.id === functionalEventId);
      const beforeFEIds = new Set(et.functionalEvents.slice(0, feIndex).map(f => f.id));

      const targetPrefix = targetSeq.path.filter(p => beforeFEIds.has(p.functionalEventId));

      const isMatchingPrefix = (seq: Sequence) => {
        const seqPrefix = seq.path.filter(p => beforeFEIds.has(p.functionalEventId));
        if (seqPrefix.length !== targetPrefix.length) return false;
        return targetPrefix.every((tp, i) => tp.functionalEventId === seqPrefix[i].functionalEventId && tp.branchId === seqPrefix[i].branchId);
      };

      // 1. Identify all sequences that match this prefix and have a decision for this FE
      const targetIndices: number[] = [];
      et.sequences.forEach((seq, idx) => {
        if (isMatchingPrefix(seq) && seq.path.some(p => p.functionalEventId === functionalEventId)) {
          targetIndices.push(idx);
        }
      });

      if (targetIndices.length === 0) return state;

      // 2. The new end state should be from the TOPMOST sequence in this group (the original success path)
      const topTargetSeq = et.sequences[targetIndices[0]];
      const newSeq: Sequence = {
        id: uuidv4(),
        path: targetPrefix,
        endStateId: topTargetSeq.endStateId
      };

      // 3. Remove all matching sequences and insert the new one at the topmost index
      const remainingSequences = et.sequences.filter((_, idx) => !targetIndices.includes(idx));
      const insertIndex = targetIndices[0];

      const finalSequences = [...remainingSequences];
      finalSequences.splice(insertIndex, 0, newSeq);

      // 4. Renumber all sequences
      const ie = state.model.initiatingEvents?.find(i => i.id === et.initiatingEventId);
      const ieCode = ie?.code || 'IE';

      const renumberedSequences = finalSequences.map((seq, index) => ({
        ...seq,
        name: `${ieCode}-${(index + 1).toString().padStart(2, '0')}`
      }));

      return {
        model: {
          ...state.model,
          eventTrees: state.model.eventTrees?.map(e =>
            e.id === eventTreeId ? { ...e, sequences: renumberedSequences } : e
          ) || [],
          updatedAt: new Date().toISOString()
        },
        isDirty: true
      };
    });
  },

  updateSequence: (eventTreeId, sequenceId, updates) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        eventTrees: state.model.eventTrees?.map(et =>
          et.id === eventTreeId
            ? { ...et, sequences: et.sequences.map(seq => seq.id === sequenceId ? { ...seq, ...updates } : seq) }
            : et
        ) || [],
        updatedAt: new Date().toISOString()
      },
      isDirty: true
    }));
  },

  updateInitiatingEvent: (id, updates) => {
    get().pushHistory();
    set((state) => {
      const updatedIEs = state.model.initiatingEvents?.map(ie => ie.id === id ? { ...ie, ...updates } : ie) || [];

      // If IE code changed, re-number all associated ET sequences
      const updatedETs = (state.model.eventTrees || []).map(et => {
        if (et.initiatingEventId === id && updates.code) {
          return {
            ...et,
            sequences: et.sequences.map((seq, index) => ({
              ...seq,
              name: `${updates.code}-${(index + 1).toString().padStart(2, '0')}`
            }))
          };
        }
        return et;
      });

      return {
        model: {
          ...state.model,
          initiatingEvents: updatedIEs,
          eventTrees: updatedETs,
          updatedAt: new Date().toISOString()
        },
        isDirty: true
      };
    });
  },

  addInitiatingEvent: (ie) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        initiatingEvents: [...(state.model.initiatingEvents || []), ie],
        updatedAt: new Date().toISOString()
      },
      isDirty: true
    }));
  },

  removeInitiatingEvent: (id) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        initiatingEvents: (state.model.initiatingEvents || []).filter(ie => ie.id !== id),
        updatedAt: new Date().toISOString()
      },
      isDirty: true
    }));
  },

  addSeismicHazard: (hazard) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        seismicHazards: [...(state.model.seismicHazards || []), hazard],
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  updateSeismicHazard: (hazard) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        seismicHazards: (state.model.seismicHazards || []).map((h) => h.id === hazard.id ? hazard : h),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  removeSeismicHazard: (id) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        seismicHazards: (state.model.seismicHazards || []).filter((h) => h.id !== id),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addSeismicFragility: (fragility) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        seismicFragilities: [...(state.model.seismicFragilities || []), fragility],
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  updateSeismicFragility: (fragility) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        seismicFragilities: (state.model.seismicFragilities || []).map((f) => f.id === fragility.id ? fragility : f),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  removeSeismicFragility: (id) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        seismicFragilities: (state.model.seismicFragilities || []).filter((f) => f.id !== id),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  updateSeismicSettings: (settings) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        seismicSettings: { ...state.model.seismicSettings, ...settings },
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  updateQuantificationSettings: (settings) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        quantificationSettings: { ...state.model.quantificationSettings, ...settings },
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  moveGateChild: (faultTreeId, gateId, childId, direction) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        faultTrees: state.model.faultTrees.map((ft) => {
          if (ft.id !== faultTreeId) return ft;
          return {
            ...ft,
            gates: ft.gates.map((g) => {
              if (g.id !== gateId) return g;
              const index = g.children.indexOf(childId);
              if (index === -1) return g;
              
              const newChildren = [...g.children];
              if (direction === 'left' && index > 0) {
                [newChildren[index], newChildren[index - 1]] = [newChildren[index - 1], newChildren[index]];
              } else if (direction === 'right' && index < newChildren.length - 1) {
                [newChildren[index], newChildren[index + 1]] = [newChildren[index + 1], newChildren[index]];
              }
              return { ...g, children: newChildren };
            })
          };
        }),
        updatedAt: new Date().toISOString()
      },
      isDirty: true
    }));
  },

  saveToLocalStorage: async () => {
    const { model } = get();
    try {
      // 1. まず大容量データを安全に保持できる IndexedDB への保存を実行（容量上限なし）
      await setIDBItem('quantica-risk-model', model);

      // 2. 互換性のために、サイズが許せば localStorage にも保存を試みる（容量超過例外をキャッチして無視）
      try {
        localStorage.setItem('quantica-risk-model', JSON.stringify(model));
      } catch (quotaError) {
        console.warn('localStorage storage limit exceeded, but successfully saved to IndexedDB (No Quota Limit)!', quotaError);
      }

      set({ isDirty: false });
    } catch (e) {
      console.error('Failed to save model to IndexedDB:', e);
    }
  },

  loadFromLocalStorage: async () => {
    try {
      // 1. まず IndexedDB からの読み込みを実行
      let parsed = await getIDBItem('quantica-risk-model');

      // 2. 無ければ従来の localStorage からフォールバック読み込み
      if (!parsed) {
        const data = localStorage.getItem('quantica-risk-model');
        if (data) {
          parsed = JSON.parse(data) as any;
        }
      }

      if (parsed) {
        // キャッシュされたモデルがデフォルトモデルであり、かつ「除熱FT」等が含まれていない古いバージョンの場合は、
        // キャッシュ（IndexedDB/localStorage）を最新のデフォルトモデルで上書きリセットする
        const defaultModel = createDefaultModel();
        const parsedFTNames = parsed.faultTrees?.map((f: any) => f.name) || [];
        const hasOldFTs = parsedFTNames.includes('New FT') || parsedFTNames.includes('New FT2');
        const hasLatestFTs = parsedFTNames.includes('除熱FT') && parsedFTNames.includes('循環参照検証用1');
        
        if (parsed.id === defaultModel.id || hasOldFTs || !hasLatestFTs) {
          if (hasOldFTs || !hasLatestFTs || !parsed.updatedAt || new Date(parsed.updatedAt) < new Date(defaultModel.updatedAt)) {
            parsed = defaultModel;
            await setIDBItem('quantica-risk-model', defaultModel);
            try {
              localStorage.setItem('quantica-risk-model', JSON.stringify(defaultModel));
            } catch (_) {}
          }
        }
        if (!parsed.seismicHazards) {
          parsed.seismicHazards = [];
        } else {
          parsed.seismicHazards = parsed.seismicHazards.map((h: any) => {
            if (h.points && !h.fractiles) {
              const { points, ...rest } = h;
              return {
                ...rest,
                fractiles: [{
                  id: uuidv4(),
                  name: 'Mean',
                  percentile: -1,
                  points: points
                }]
              };
            }
            return h;
          });
        }
        if (!parsed.seismicFragilities) {
          parsed.seismicFragilities = [];
        } else {
          parsed.seismicFragilities = parsed.seismicFragilities.map((f: any) => ({
            ...f,
            type: f.type || 'lognormal',
            points: f.points || []
          }));
        }
        if (!parsed.seismicSettings) parsed.seismicSettings = {
          hazardCurveId: '',
          selectedETIds: [],
          minPGA: 0.05,
          maxPGA: 2.0,
          intervals: 20
        };
        if (!parsed.seismicSettings.selectedETIds) parsed.seismicSettings.selectedETIds = [];
        if (!parsed.quantificationSettings) {
          parsed.quantificationSettings = {
            cutOff: 1e-20,
            bddCutOff: 1e-20,
            enablePruning: false,
            approximation: ['bdd_exact', 'mcub', 'rare_event'],
            monteCarloSamples: 10000,
            useLHS: true,
            runUncertainty: false,
            maxCutsets: 100000
          };
        } else {
          // Force update legacy default values
          // Force reset legacy cutoff to 1e-20 once for existing users to respect the new default policy.
          if (typeof window !== 'undefined' && !window.localStorage.getItem('quantica-risk-cutoff-v3-reset')) {
            parsed.quantificationSettings.cutOff = 1e-20;
            parsed.quantificationSettings.bddCutOff = 1e-20;
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('quantica-risk-cutoff-v3-reset', 'done');
            }
          } else {
            // Fallback legacy checks just in case
            if (parsed.quantificationSettings.cutOff === 1e-10 || parsed.quantificationSettings.cutOff === 1e-9 || parsed.quantificationSettings.cutOff === 1 || !parsed.quantificationSettings.cutOff) {
              parsed.quantificationSettings.cutOff = 1e-20;
            }
            if (parsed.quantificationSettings.bddCutOff === undefined || parsed.quantificationSettings.bddCutOff === 1) {
              parsed.quantificationSettings.bddCutOff = 1e-20;
            }
          }
          // Force update legacy enablePruning = true once to respect the new default-off policy for existing users.
          // UPGRADED v8: Directly commit changes back to storage immediately so other components read clean state.
          if (parsed.quantificationSettings.enablePruning === undefined || 
              (typeof window !== 'undefined' && !window.localStorage.getItem('quantica-risk-pruning-v8-storage-load-sync'))) {
            parsed.quantificationSettings.enablePruning = false;
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('quantica-risk-pruning-v8-storage-load-sync', 'done');
              // Force write-through cache right now to eradicate memory-only race conditions!
              await setIDBItem('quantica-risk-model', parsed);
              try {
                localStorage.setItem('quantica-risk-model', JSON.stringify(parsed));
              } catch (_) {}
            }
          }
          // Convert legacy single-string approximation into array default
          const currentAppx = parsed.quantificationSettings.approximation;
          if (typeof currentAppx === 'string' && currentAppx === 'bdd_exact') {
            parsed.quantificationSettings.approximation = ['bdd_exact', 'mcub', 'rare_event'];
            parsed.quantificationSettings.runUncertainty = false;
          } else if (!Array.isArray(currentAppx)) {
            parsed.quantificationSettings.approximation = ['bdd_exact', 'mcub', 'rare_event'];
          }
        }

        const model: PRAModel = {
          ...parsed,
          faultTrees: Array.isArray(parsed.faultTrees) ? parsed.faultTrees : [],
          basicEvents: (Array.isArray(parsed.basicEvents) ? parsed.basicEvents : []).reduce((acc: BasicEvent[], be: BasicEvent) => {
            let uniqueName = be.name;
            let counter = 1;
            while (acc.some(e => e.name === uniqueName)) {
              counter++;
              uniqueName = `${be.name}_${counter}`;
            }
            acc.push({ ...be, name: uniqueName });
            return acc;
          }, []),
          parameters: parsed.parameters || [],
          ccfGroups: parsed.ccfGroups || [],
          endStates: (parsed.endStates || []).map((es: any) => ({
            ...es,
            categories: es.categories || (es.category ? [es.category] : ['core_damage'])
          })),
        } as PRAModel;

        // --- Cleanup Dangling References (Ghost IDs) ---
        const allValidIds = new Set([
          ...model.basicEvents.map(be => be.id),
          ...model.faultTrees.flatMap(ft => ft.gates.map(g => g.id))
        ]);

        model.faultTrees = model.faultTrees.map(ft => ({
          ...ft,
          gates: ft.gates.map(g => ({
            ...g,
            children: g.children.filter(cid => allValidIds.has(cid))
          }))
        }));
        // -----------------------------------------------
        
        // --- Recovery Groups Migration & Auto-activation ---
        if (!model.recoveryGroups) {
          model.recoveryGroups = [];
        }
        if ((model.recoveryRules && model.recoveryRules.length > 0) && model.recoveryGroups.length === 0) {
          const defaultGroup = {
            id: uuidv4(),
            name: model.locale === 'ja' ? 'デフォルト・リカバリーグループ' : 'Default Recovery Group',
            description: model.locale === 'ja' ? '既存のリカバリールールから移行されたグループです。' : 'Migrated from legacy recovery rules.',
            rules: model.recoveryRules
          };
          model.recoveryGroups = [defaultGroup];
          model.activeRecoveryGroupId = defaultGroup.id;
        }

        // Auto-activate first group if none active
        if (model.recoveryGroups && model.recoveryGroups.length > 0 && !model.activeRecoveryGroupId) {
          model.activeRecoveryGroupId = model.recoveryGroups[0].id;
        }
        if (model.flagGroups && model.flagGroups.length > 0 && !model.activeFlagGroupId) {
          model.activeFlagGroupId = model.flagGroups[0].id;
        }
        // -------------------------------------------------

        set({ model, isDirty: false, selectedFaultTreeId: model.faultTrees?.[0]?.id ?? null });
        return true;
      }
    } catch (e) {
      console.error('Failed to load model:', e);
    }
    return false;
  },

  convertToSubtree: (faultTreeId, gateId) => {
    get().pushHistory();
    let newlyCreatedFTId: string | null = null;
    
    set((state) => {
      const ft = state.model.faultTrees.find(f => f.id === faultTreeId);
      if (!ft) return state;

      const targetGate = ft.gates.find(g => g.id === gateId);
      if (!targetGate) return state;

      if (ft.topGateId === gateId) {
        alert(state.model.locale === 'ja' ? '最上位ゲートをサブツリーとして分離することはできません。' : 'Cannot convert the top gate into a sub-tree.');
        return state;
      }

      // 1. Collect all descendant nodes (gates)
      const descendantGateIds = new Set<string>();
      const collect = (id: string) => {
        const g = ft.gates.find(x => x.id === id);
        if (g && !descendantGateIds.has(id)) {
          descendantGateIds.add(id);
          g.children.forEach(collect);
        }
      };
      collect(gateId);

      // 2. Map old IDs to NEW IDs for the sub-tree to avoid any global ID collisions
      const idMap = new Map<string, string>();
      descendantGateIds.forEach(oldId => idMap.set(oldId, uuidv4()));

      // 3. Extract and transform gates for the new tree
      const subTreeGates: Gate[] = ft.gates
        .filter(g => descendantGateIds.has(g.id))
        .map(g => ({
          ...g,
          id: idMap.get(g.id)!,
          children: g.children.map(cid => idMap.get(cid) || cid)
        }));
      
      const newFT: FaultTree = {
        id: uuidv4(),
        name: `Sub: ${targetGate.name}`,
        topGateId: idMap.get(gateId)!,
        gates: subTreeGates
      };

      newlyCreatedFTId = newFT.id;

      // 4. Update the original tree: Replace targetGate with a TRANSFER gate
      const updatedGates = ft.gates
        .filter(g => !descendantGateIds.has(g.id) || g.id === gateId) 
        .map(g => {
          if (g.id === gateId) {
            return {
              ...g,
              type: 'TRANSFER' as GateType,
              children: [], 
              linkedFaultTreeId: newFT.id
            };
          }
          return g;
        });

      return {
        model: {
          ...state.model,
          faultTrees: [
            ...state.model.faultTrees.map(f => f.id === faultTreeId ? { ...f, gates: updatedGates } : f),
            newFT
          ],
          updatedAt: new Date().toISOString()
        },
        selectedFaultTreeId: newFT.id,
        isDirty: true
      };
    });

    // Automatically layout the new tree so it's clean and centered
    if (newlyCreatedFTId) {
      setTimeout(() => get().autoLayout(newlyCreatedFTId!), 100);
    }
  },

  addFlagGroup: (group) => {
    get().pushHistory();
    set((state) => {
      const groups = [...(state.model.flagGroups || []), group];
      const activeId = state.model.activeFlagGroupId || group.id;
      return {
        model: {
          ...state.model,
          flagGroups: groups,
          activeFlagGroupId: activeId,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });
  },

  updateFlagGroup: (id, updates) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        flagGroups: (state.model.flagGroups || []).map((g) => g.id === id ? { ...g, ...updates } : g),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  removeFlagGroup: (id) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        flagGroups: (state.model.flagGroups || []).filter((g) => g.id !== id),
        activeFlagGroupId: state.model.activeFlagGroupId === id ? undefined : state.model.activeFlagGroupId,
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addRecoveryGroup: (group) => {
    get().pushHistory();
    set((state) => {
      const groups = [...(state.model.recoveryGroups || []), group];
      const activeId = state.model.activeRecoveryGroupId || group.id;
      return {
        model: {
          ...state.model,
          recoveryGroups: groups,
          activeRecoveryGroupId: activeId,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });
  },

  updateRecoveryGroup: (id, updates) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        recoveryGroups: (state.model.recoveryGroups || []).map((g) => g.id === id ? { ...g, ...updates } : g),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  removeRecoveryGroup: (id) => {
    get().pushHistory();
    set((state) => ({
      model: {
        ...state.model,
        recoveryGroups: (state.model.recoveryGroups || []).filter((g) => g.id !== id),
        activeRecoveryGroupId: state.model.activeRecoveryGroupId === id ? undefined : state.model.activeRecoveryGroupId,
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    }));
  },

  addRecoveryRule: (rule) => {
    get().pushHistory();
    set((state) => {
      const activeGroupId = state.model.activeRecoveryGroupId;
      if (activeGroupId) {
        const groups = (state.model.recoveryGroups || []).map(g => {
          if (g.id === activeGroupId) {
            return {
              ...g,
              rules: [...(g.rules || []), rule]
            };
          }
          return g;
        });
        return {
          model: {
            ...state.model,
            recoveryGroups: groups,
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        };
      } else {
        return {
          model: {
            ...state.model,
            recoveryRules: [...(state.model.recoveryRules || []), rule],
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        };
      }
    });
  },

  updateRecoveryRule: (id, updates) => {
    get().pushHistory();
    set((state) => {
      const activeGroupId = state.model.activeRecoveryGroupId;
      if (activeGroupId) {
        const groups = (state.model.recoveryGroups || []).map(g => {
          if (g.id === activeGroupId) {
            return {
              ...g,
              rules: (g.rules || []).map(r => r.id === id ? { ...r, ...updates } : r)
            };
          }
          return g;
        });
        return {
          model: {
            ...state.model,
            recoveryGroups: groups,
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        };
      } else {
        return {
          model: {
            ...state.model,
            recoveryRules: (state.model.recoveryRules || []).map(r => r.id === id ? { ...r, ...updates } : r),
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        };
      }
    });
  },

  removeRecoveryRule: (id) => {
    get().pushHistory();
    set((state) => {
      const activeGroupId = state.model.activeRecoveryGroupId;
      if (activeGroupId) {
        const groups = (state.model.recoveryGroups || []).map(g => {
          if (g.id === activeGroupId) {
            return {
              ...g,
              rules: (g.rules || []).filter(r => r.id !== id)
            };
          }
          return g;
        });
        return {
          model: {
            ...state.model,
            recoveryGroups: groups,
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        };
      } else {
        return {
          model: {
            ...state.model,
            recoveryRules: (state.model.recoveryRules || []).filter(r => r.id !== id),
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        };
      }
    });
  }
}));
