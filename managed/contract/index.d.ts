import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type StudentCertificate = { studentId: Uint8Array;
                                   subjectId: Uint8Array;
                                   marks: bigint;
                                   salt: Uint8Array
                                 };

export type Witnesses<PS> = {
  getStudentCertificate(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, StudentCertificate];
}

export type ImpureCircuits<PS> = {
  verifyCertificate(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
}

export type ProvableCircuits<PS> = {
  verifyCertificate(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  verifyCertificate(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
}

export type Ledger = {
  verifiedCertificates: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  readonly totalVerified: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): Promise<__compactRuntime.ConstructorResult<PS>>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
export declare const expectedVk: Record<string, string>;
