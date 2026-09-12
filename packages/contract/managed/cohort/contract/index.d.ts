import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  wAge(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  wCondition(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, boolean];
  wMedication(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, boolean];
  wSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  wBlind(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  proveEligible(context: __compactRuntime.CircuitContext<PS>,
                trialId_0: Uint8Array,
                minAge_0: bigint,
                maxAge_0: bigint,
                requireCondition_0: boolean,
                forbidMedication_0: boolean): __compactRuntime.CircuitResults<PS, boolean>;
}

export type ProvableCircuits<PS> = {
  proveEligible(context: __compactRuntime.CircuitContext<PS>,
                trialId_0: Uint8Array,
                minAge_0: bigint,
                maxAge_0: bigint,
                requireCondition_0: boolean,
                forbidMedication_0: boolean): __compactRuntime.CircuitResults<PS, boolean>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  proveEligible(context: __compactRuntime.CircuitContext<PS>,
                trialId_0: Uint8Array,
                minAge_0: bigint,
                maxAge_0: bigint,
                requireCondition_0: boolean,
                forbidMedication_0: boolean): __compactRuntime.CircuitResults<PS, boolean>;
}

export type Ledger = {
  spent: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  referrals: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly proven: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
