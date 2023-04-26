pragma circom 2.0.0;

include "./circuit.circom";

component main { public [ pubkey ] } = HashAndSignJson(25); // 14806 constraints
