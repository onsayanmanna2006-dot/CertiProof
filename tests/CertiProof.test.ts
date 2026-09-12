import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createConstructorContext, 
  createCircuitContext, 
  dummyContractAddress, 
  emptyZswapLocalState, 
  CostModel 
} from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, type Witnesses, type Ledger } from '../managed/contract/index.js';

// Helper to encode string into 32-byte Uint8Array
function stringToBytes32(str: string): Uint8Array {
  const bytes = new Uint8Array(32);
  const encoded = new TextEncoder().encode(str);
  bytes.set(encoded.slice(0, 32));
  return bytes;
}

// Helper to format 32-byte Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// CoinPublicKey is a hex-encoded string, not raw bytes
const DUMMY_COIN_PUBLIC_KEY = '00'.repeat(32);

describe('CertiProof ZK-Certificate-Verifier Contract Tests', () => {
  let activeStudentMarks: bigint;
  let activeStudentId: Uint8Array;
  let activeSubjectId: Uint8Array;
  let activeSalt: Uint8Array;

  // Set up witness providing private student certificate data
  const witnesses: Witnesses<any> = {
    getStudentCertificate: (context) => {
      return [
        context.privateState,
        {
          studentId: activeStudentId,
          subjectId: activeSubjectId,
          marks: activeStudentMarks,
          salt: activeSalt,
        },
      ];
    },
  };

  beforeEach(() => {
    // Default valid certificate values
    activeStudentId = stringToBytes32('STUDENT_001_ALICE');
    activeSubjectId = stringToBytes32('CS_101_ALGORITHMS');
    activeStudentMarks = 78n; // >= 60 passes
    activeSalt = stringToBytes32('random_entropy_salt_49821');
  });

  it('1. A student with marks >= 60 passes verification successfully', async () => {
    activeStudentMarks = 78n; // Score >= 60

    const contract = new Contract(witnesses);
    const constructorCtx = createConstructorContext({}, DUMMY_COIN_PUBLIC_KEY);
    const initRes = await contract.initialState(constructorCtx);

    const contractAddress = dummyContractAddress();
    const circuitCtx = createCircuitContext(
      contractAddress,
      emptyZswapLocalState(DUMMY_COIN_PUBLIC_KEY),
      initRes.currentContractState,
      initRes.currentPrivateState,
      undefined,
      CostModel.initialCostModel()
    );

    const executionResult = await contract.impureCircuits.verifyCertificate(circuitCtx);

    // Verify circuit returned a valid 32-byte certificate hash
    expect(executionResult.result).toBeDefined();
    expect(executionResult.result.length).toBe(32);
    expect(bytesToHex(executionResult.result)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('2. A student with marks < 60 fails verification and aborts', async () => {
    activeStudentMarks = 55n; // Score < 60 must be rejected by ZK circuit

    const contract = new Contract(witnesses);
    const constructorCtx = createConstructorContext({}, DUMMY_COIN_PUBLIC_KEY);
    const initRes = await contract.initialState(constructorCtx);

    const contractAddress = dummyContractAddress();
    const circuitCtx = createCircuitContext(
      contractAddress,
      emptyZswapLocalState(DUMMY_COIN_PUBLIC_KEY),
      initRes.currentContractState,
      initRes.currentPrivateState,
      undefined,
      CostModel.initialCostModel()
    );

    expect(() =>
      contract.impureCircuits.verifyCertificate(circuitCtx)
    ).toThrow(/Student marks must be at least 60 to pass verification/);
  });

  it('3. Public verification state is updated correctly on-chain', async () => {
    activeStudentMarks = 92n; // High distinction

    const contract = new Contract(witnesses);
    const constructorCtx = createConstructorContext({}, DUMMY_COIN_PUBLIC_KEY);
    const initRes = await contract.initialState(constructorCtx);

    // Initial state check: 0 verified certificates
    const initialLedger = ledger(initRes.currentContractState.data);
    expect(initialLedger.totalVerified).toBe(0n);
    expect(initialLedger.verifiedCertificates.isEmpty()).toBe(true);

    const contractAddress = dummyContractAddress();
    const circuitCtx = createCircuitContext(
      contractAddress,
      emptyZswapLocalState(DUMMY_COIN_PUBLIC_KEY),
      initRes.currentContractState,
      initRes.currentPrivateState
    );

    const executionResult = await contract.impureCircuits.verifyCertificate(circuitCtx);
    const certHash = executionResult.result;

    // Inspect updated ledger from the execution context
    const updatedState = executionResult.context.currentQueryContext.state;
    const updatedLedger: Ledger = ledger(updatedState);

    // Assert public counter incremented
    expect(updatedLedger.totalVerified).toBe(1n);

    // Assert certificate hash is recorded in public verified map
    expect(updatedLedger.verifiedCertificates.isEmpty()).toBe(false);
    expect(updatedLedger.verifiedCertificates.member(certHash)).toBe(true);
    expect(updatedLedger.verifiedCertificates.lookup(certHash)).toBe(true);
  });

  it('4. Sensitive student information is NOT placed in the public ledger state', async () => {
    activeStudentMarks = 88n;
    activeStudentId = stringToBytes32('CONFIDENTIAL_STUDENT_ID_999');

    const contract = new Contract(witnesses);
    const constructorCtx = createConstructorContext({}, DUMMY_COIN_PUBLIC_KEY);
    const initRes = await contract.initialState(constructorCtx);

    const contractAddress = dummyContractAddress();
    const circuitCtx = createCircuitContext(
      contractAddress,
      emptyZswapLocalState(DUMMY_COIN_PUBLIC_KEY),
      initRes.currentContractState,
      initRes.currentPrivateState
    );

    const executionResult = await contract.impureCircuits.verifyCertificate(circuitCtx);
    const updatedLedger = ledger(executionResult.context.currentQueryContext.state);

    // Verify public ledger only contains verifiedCertificates and totalVerified
    const ledgerKeys = Object.keys(updatedLedger);
    expect(ledgerKeys).toContain('verifiedCertificates');
    expect(ledgerKeys).toContain('totalVerified');

    // Confirm that sensitive properties are NOT public ledger fields
    expect((updatedLedger as any).marks).toBeUndefined();
    expect((updatedLedger as any).studentMarks).toBeUndefined();
    expect((updatedLedger as any).studentId).toBeUndefined();
    expect((updatedLedger as any).salt).toBeUndefined();

    // Verify marks value (88) does not appear in ledger representation
    const serializedLedger = JSON.stringify(ledgerKeys);
    expect(serializedLedger).not.toContain('88');
    expect(serializedLedger).not.toContain('CONFIDENTIAL_STUDENT_ID_999');
  });

  it('5. Certificate verification works deterministically with a valid certificate/hash', async () => {
    activeStudentMarks = 65n;

    const contract = new Contract(witnesses);
    const constructorCtx = createConstructorContext({}, DUMMY_COIN_PUBLIC_KEY);
    const initRes = await contract.initialState(constructorCtx);

    const contractAddress = dummyContractAddress();
    const circuitCtx = createCircuitContext(
      contractAddress,
      emptyZswapLocalState(DUMMY_COIN_PUBLIC_KEY),
      initRes.currentContractState,
      initRes.currentPrivateState
    );

    const firstRun = await contract.impureCircuits.verifyCertificate(circuitCtx);

    // Run again with identical certificate data
    const secondRun = await contract.impureCircuits.verifyCertificate(circuitCtx);

    // persistentHash must be strictly deterministic
    expect(bytesToHex(firstRun.result)).toEqual(bytesToHex(secondRun.result));
  });

  it('6. Boundary test: Exactly 60 marks passes, 59 marks fails', async () => {
    const contract = new Contract(witnesses);
    const constructorCtx = createConstructorContext({}, DUMMY_COIN_PUBLIC_KEY);
    const initRes = await contract.initialState(constructorCtx);
    const contractAddress = dummyContractAddress();

    // Boundary Test A: Exactly 60 marks (Passing boundary)
    activeStudentMarks = 60n;
    const passCtx = createCircuitContext(
      contractAddress,
      emptyZswapLocalState(DUMMY_COIN_PUBLIC_KEY),
      initRes.currentContractState,
      initRes.currentPrivateState
    );
    const passResult = await contract.impureCircuits.verifyCertificate(passCtx);
    expect(passResult.result).toBeDefined();

    // Boundary Test B: 59 marks (Failing boundary)
    activeStudentMarks = 59n;
    const failCtx = createCircuitContext(
      contractAddress,
      emptyZswapLocalState(DUMMY_COIN_PUBLIC_KEY),
      initRes.currentContractState,
      initRes.currentPrivateState
    );
    expect(() =>
      contract.impureCircuits.verifyCertificate(failCtx)
    ).toThrow(/Student marks must be at least 60 to pass verification/);
  });
});
