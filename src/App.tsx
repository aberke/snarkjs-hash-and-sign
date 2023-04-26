import React, { useState } from "react";
import "./App.css";

const snarkjs = require("snarkjs");
const { buildBabyjub, buildMimc7, buildEddsa } = require("circomlibjs");

// Use circuit files with size matching MAX_JSON_SIZE
const wasmFile = "http://localhost:8000/circuit_25_js/circuit_25.wasm";
const zkeyFile = "http://localhost:8000/circuit_25.zkey";
const verificationKey = "http://localhost:8000/verification_key_25.json";
// const wasmFile = "http://localhost:8000/circuit_1400_js/circuit_1400.wasm";
// const zkeyFile = "http://localhost:8000/circuit_1400.zkey";
// const verificationKey = "http://localhost:8000/verification_key_1400.json";

// Update this constant to match the circuit version
// small is for testing (faster prove/verify)
const MAX_JSON_SIZE = 25;
// const MAX_JSON_SIZE = 1400;


// utilities
export type Ascii = number;
export function toAsciiArray(str: string): Ascii[] {
    return Array.from(str).map((_, i) => str.charCodeAt(i));
}

const isValidJson = (jsonInput) => {
	try {
		JSON.parse(jsonInput);
		return true;
	} catch (ex) {
		return false;
	}
}


function App() {
	const [jsonInput, setJsonInput] = useState(`{"name": "aberke"}`);
	const [paddedJsonAscii, setPaddedJsonAscii] = useState<any | null>(null);

	const [proof, setProof] = useState("");
	const [signals, setSignals] = useState("");
	const [isValid, setIsValid] = useState(false);

	const [proofInput, setProofInput] = useState<any | null>(null);

	const generateProof = async () => {
		if (!proofInput) {
			console.error('no valid proof input');
			return;
		}
		console.log('generating proof...')
		const { proof, publicSignals } = await snarkjs.groth16.fullProve(proofInput, wasmFile, zkeyFile);
		console.log('generated proof')
		setProof(JSON.stringify(proof, null, 2));
		setSignals(JSON.stringify(publicSignals, null, 2));
	};

	const handleVerifyProof = async () => {
		const vkey = await fetch(verificationKey).then(function (res) {
			return res.json();
		});
		const isValid = await snarkjs.groth16.verify(vkey, JSON.parse(signals), JSON.parse(proof));
		setIsValid(isValid);
	};

	const jsonToPaddedAsciiArray = (jsonInput: string) => {
		// Convert to object and back to string in order to have consistent representation
		// e.g. consistent key sorting, removed whitespace
		const parsedJson = JSON.stringify(JSON.parse(jsonInput));
		// Array of integers representing ascii characters.
		// Note: Doesn't matter if this is array of integers or strings of integers
		// i.e. {"test":[1,0]} same as {"test":["1", "0"]}
		const jsonAsciiArray = toAsciiArray(parsedJson);
		// Pad the ascii array to the predetermined size.
		// This is necessary because a predetermined size must be used in compiled circuit.
		// First check it does not exceed this size.
		if (jsonAsciiArray.length > MAX_JSON_SIZE) {
			console.error('Cannot handle json: too large. Max size:', MAX_JSON_SIZE, 'Json array size:', jsonAsciiArray.length);
			return;
		}
		const jsonSize = jsonAsciiArray.length; // Size before padding
		const paddingLength = MAX_JSON_SIZE - jsonSize;
		return jsonAsciiArray.concat(Array(paddingLength).fill(0));
	};

	const handleInput = async () => {
		// Transform JSON input to a string of ascii bytes
		// Check if this is valid JSON (though we do not need it as an object for now)
		if (!isValidJson(jsonInput)) {
			console.log('invalid json input:', jsonInput); // TODO: error handling
			return false;
		}
		const paddedJsonAsciiArray = jsonToPaddedAsciiArray(jsonInput);
		if (!paddedJsonAsciiArray) {
			return;
		}
		setPaddedJsonAscii(paddedJsonAsciiArray);

		// Handle hashing and signature
		const mimc7 = await buildMimc7();
		const babyJub = await buildBabyjub();
		const F = babyJub.F;

		const k = 1;
		const hash = mimc7.multiHash(paddedJsonAsciiArray, k);
		// handle signature
		// TODO: Key management. This is just an example
		const eddsa = await buildEddsa();
		console.log('generating Eddsa (sk, pk) key pair')
		const sk = Buffer.from("1".toString().padStart(64, "0"), "hex");
		const pk = eddsa.prv2pub(sk);
		console.log('public key:', pk);
		// do the signing
		const signature = eddsa.signMiMC(sk, hash);

		const inputs = {
			json: paddedJsonAsciiArray,
			expected_hash: BigInt(F.toObject(hash)).toString(),
			pubkey: [
				BigInt(F.toObject(pk[0])).toString(),
				BigInt(F.toObject(pk[1])).toString(),
			],
			signature_R8x: BigInt(F.toObject(signature.R8[0])).toString(),
			signature_R8y: BigInt(F.toObject(signature.R8[1])).toString(),
			signature_S: BigInt(signature.S).toString(),
		};
		console.log('inputs')
		console.log(JSON.stringify(inputs));
		setProofInput(inputs);
	}

	const changeJsonInput = (e) => {
		setJsonInput(e.target.value);
	}

	return (
		<div>
			<header className="App-header">
				<p>
					Hash and sign JSON using MIMC
				</p>
				<p>Using max JSON size: {MAX_JSON_SIZE}</p>

				<p>Witness Inputs</p>

				<input
					type="text" required={true} value={jsonInput} 
					onChange={changeJsonInput} placeholder="{'hi':'a'}"
				></input>
				<br/>
				<button onClick={handleInput}>Handle Input</button>
				<br/>
				JSON ascii array input: 
				<pre>{paddedJsonAscii}</pre>
				<p>Proof input:</p>
				<pre>{JSON.stringify(proofInput)}</pre>

				<button onClick={generateProof}>Generate Proof</button>
				<br/>
				<p>Proof</p>
				<pre>{proof}</pre>
				<p>Signals [hash, publickey[0], publickey[1]]</p>
				<pre>{signals}</pre>
				<button onClick={handleVerifyProof}>Verify Proof</button>
				<p>Result:</p>
				{proof.length > 0 && <p>{isValid ? "Valid proof" : "Invalid proof"}</p>}
			</header>
		</div>
	);
}

export default App;
