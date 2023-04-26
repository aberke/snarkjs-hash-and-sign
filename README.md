# React + snarkjs

## What

Hash and sign with a ZK proof.
Assuming public signing key.

Implemented for arbitrary JSON.

The interface is ugly. Also intends user to copy from console logs. The point is to implement an end-to-end working hash and sign zk proof for integration into other projects. 

## Run

To install the necessary packages etc, run `yarn install`. 

The circuit-specific files are provided to the react frontend through express. 

To run the example, start the express server in `file-server` and the react application:
```
# Run fileserver:
cd src/file-server
node index.js

# Start react
yarn start
```

The circuit and related files are located in the folder `src/zkproof`. 

To fix ssl issue:
`export NODE_OPTIONS=--openssl-legacy-provider`

`yarn start`

http://localhost:3000/


[Helpful diagram of snark](https://file.notion.so/f/s/d08b94e9-ceac-4497-97b4-be481ea5f014/Untitled.png?id=4edc02c2-caf1-47b5-9084-664d56e87382&table=block&spaceId=49789257-8634-4c86-a9e2-dcecb65edf1c&expirationTimestamp=1682116775286&signature=Lbun12RN0PDWBRfxUByA5IReWqFuSMKccOuD-JU0vTo)


### Circuit
Instructions to compile a circuit are here:
https://github.com/iden3/snarkjs#10-compile-the-circuit

We use groth16

The circuit is compiled for 2 versions 
- small input: `max_json_size=25`; good for tests
    - compiled with pot14 p-tau's
- larger input: `max_json_size=1400`
    - compiled with pot19 p-tau's

The large one is heavy, takes longer to prove/verify, requires larger files, and more powers of tau.

To generate powers of tau for pot19, I ran a ceremony. But these files are too big to commit to github.

Can generate pot19 files using instructions here: https://github.com/iden3/snarkjs#1-start-a-new-powers-of-tau-ceremony

circuit_1400.zkey is also too large. 

Can generate this file again by using pot19 files and steps below (from the snarkjs documentation).

#### challenges of note

Our curcuit has many more constaints than examples or intended use cases due to our desire to send the json string as we do.

Larger JSON --> More constraints --> Requires more powers of tau.

Must have total constraints < 2**p-taus

More constraints requires more powers of tau.


```
circom circuit_1400.circom --r1cs --wasm --sym

node circuit_1400_js/generate_witness.js circuit_1400_js/circuit_1400.wasm ./input_1400.json ./witness_1400.wtns

# check witness

snarkjs wtns check circuit_1400.r1cs witness_1400.wtns

snarkjs groth16 setup circuit_1400.r1cs pot19_final.ptau circuit_1400.zkey

# Then I skip some production specific steps for phase 2 contirbutions
# step 21. verify the zkey

snarkjs zkey verify circuit_1400.r1cs pot19_final.ptau circuit_1400.zkey

# 22. export the zkey

snarkjs zkey export verificationkey circuit_1400.zkey verification_key_1400.json

# 23. proof

snarkjs groth16 prove circuit_1400.zkey witness_1400.wtns proof_1400.json public_1400.json

# 24. verify the proof

snarkjs groth16 verify verification_key_1400.json public_1400.json proof_1400.json


```
