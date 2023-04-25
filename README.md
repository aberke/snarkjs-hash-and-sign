# React + snarkjs

Hash and sign 

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

## Notes from Alex changes

To fix ssl issue:
`export NODE_OPTIONS=--openssl-legacy-provider`

`yarn start`

http://localhost:3000/


[Helpful diagram of snark](https://file.notion.so/f/s/d08b94e9-ceac-4497-97b4-be481ea5f014/Untitled.png?id=4edc02c2-caf1-47b5-9084-664d56e87382&table=block&spaceId=49789257-8634-4c86-a9e2-dcecb65edf1c&expirationTimestamp=1682116775286&signature=Lbun12RN0PDWBRfxUByA5IReWqFuSMKccOuD-JU0vTo)

Instructions to compile a circuit are here:
https://github.com/iden3/snarkjs#10-compile-the-circuit

### Work in progress notes

witness successfully computes for hash_and_sign_json_mimc_circuit

% snarkjs wtns check hash_and_sign_json_mimc_circuit.r1cs hash_and_sign_json_witness.wtns


### TODO

Move my powers of tau over here


