import React, { useState } from "react";
import "./App.css";

// I got rid of rimble-ui because of dependency issues
//import { Field, Input, Text, Button, Link } from "rimble-ui";

const snarkjs = require("snarkjs");
const fs = require("fs");
const { buildBabyjub, buildMimc7, buildEddsa } = require("circomlibjs");

const MAX_JSON_SIZE = 1000; // TODO: increase the size after testing (slower)

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


const makeProof = async (_proofInput: any, _wasm: string, _zkey: string) => {
	const { proof, publicSignals } = await snarkjs.groth16.fullProve(_proofInput, _wasm, _zkey);
	return { proof, publicSignals };
};

const verifyProof = async (_verificationkey: string, signals: any, proof: any) => {
	const vkey = await fetch(_verificationkey).then(function (res) {
		return res.json();
	});
	const res = await snarkjs.groth16.verify(vkey, signals, proof);
	return res;
};

function App() {
	const [a, setA] = useState("3");
	const [b, setB] = useState("11");
	const [jsonInput, setJsonInput] = useState(`{"name": "aberke"}`);

	const [proof, setProof] = useState("");
	const [signals, setSignals] = useState("");
	const [isValid, setIsValid] = useState(false);

	let wasmFile = "http://localhost:8000/circuit.wasm";
	let zkeyFile = "http://localhost:8000/circuit_final.zkey";
	let verificationKey = "http://localhost:8000/verification_key.json";

	const runProofs = () => {
		console.log(b.length);
		if (a.length == 0 || b.length == 0) {
			return;
		}
		let proofInput = { a, b };
		console.log(proofInput);

		makeProof(proofInput, wasmFile, zkeyFile).then(({ proof: _proof, publicSignals: _signals }) => {
			setProof(JSON.stringify(_proof, null, 2));
			setSignals(JSON.stringify(_signals, null, 2));
			verifyProof(verificationKey, _signals, _proof).then((_isValid) => {
				setIsValid(_isValid);
			});
		});
	};
	const changeA = (e) => {
		setA(e.target.value);
	};
	const changeB = (e) => {
		setB(e.target.value);
	};



	const handleJsonInput = async () => {
		console.log('handleJsonInput')
		// Transform JSON input to a string of ascii bytes
		// Check if this is valid JSON (though we do not need it as an object for now)
		if (!isValidJson(jsonInput)) {
			console.log('invalid json input:', jsonInput); // TODO: error handling
			return false;
		}
		// Convert to object and back to string in order to have consistent representation
		// e.g. consistent key sorting, removed whitespace
		const parsedJson = JSON.stringify(JSON.parse(jsonInput));
		// Array of integers representing ascii characters.
		// Note: Doesn't matter if this is array of integers or strings of integers
		// i.e. {"test":[1,0]} same as {"test":["1", "0"]}
		const jsonAsciiArray = toAsciiArray(parsedJson);
		console.log('jsonAsciiArray')
		console.log(jsonAsciiArray);
		// Pad the ascii array to the predetermined size.
		// This is necessary because a predetermined size must be used in compiled circuit.
		// First check it does not exceed this size.
		if (jsonAsciiArray.length > MAX_JSON_SIZE) {
			console.error('Cannot handle json: too large. Max size:', MAX_JSON_SIZE, 'Json array size:', jsonAsciiArray.length);
			return false;
		}
		const jsonSize = jsonAsciiArray.length; // Size before padding
		const paddingLength = MAX_JSON_SIZE - jsonSize;
		const paddedInput = jsonAsciiArray.concat(Array(paddingLength).fill(0));
		console.log('paddedInput')
		console.log(paddedInput)

		const mimc7 = await buildMimc7();
		const babyJub = await buildBabyjub();
		const F = babyJub.F;

		const k = 1;
		const hash = mimc7.multiHash(paddedInput, k);

		// handle signature
		const eddsa = await buildEddsa();
		console.log('generating Eddsa (sk, pk) key pair')
		const sk = Buffer.from("1".toString().padStart(64, "0"), "hex");
		const pk = eddsa.prv2pub(sk);
		console.log('public key:', pk);
		// do the signing
		const signature = eddsa.signMiMC(sk, hash);

		const inputs = {
			json: paddedInput,
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
		console.log(JSON.stringify(inputs))
	}

	const handleSignature = () => {
		// TODO: move things here
	}

	const changeJsonInput = (e) => {
		setJsonInput(e.target.value);
	}

	return (
		<div>
			<header className="App-header">
				<p>
					Hash and sign JSON with MIMC - testing
				</p>

				<pre>Witness Inputs</pre>

				<textarea 
					label="json input" rows="4"
					type="text" required={true} value={jsonInput} 
					onChange={changeJsonInput} placeholder="{'hi':'a'}"
				></textarea>
				<br/>
				<button onClick={handleJsonInput}>Handle Input</button>
				<br/>

				{/* <p>
					The underlying circuit is from the <a href="https://github.com/iden3/snarkjs">snarkjs readme</a>
				</p>
				<pre>Witness Inputs</pre>

				<Field label="Input a:">
					<Input type="text" required={true} value={a} onChange={changeA} placeholder="e.g. 3" />
				</Field>
				<Field label="Input b:">
					<input type="text" required={true} value={b} onChange={changeB} placeholder="e.g. 11" />
				</Field> */}

				<button onClick={runProofs}>Generate Proof</button>
				<br/>
				Proof: <p>{proof}</p>
				Signals: <p>{signals}</p>
				Result:
				{proof.length > 0 && <p>{isValid ? "Valid proof" : "Invalid proof"}</p>}
			</header>
		</div>
	);
}

export default App;
