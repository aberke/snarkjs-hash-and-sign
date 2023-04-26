pragma circom 2.0.0;

/*
Implements hash-and-sign over JSON, using MIMC hash function.

Outputs the hash.
*/


// include "circomlib/circuits/mimc.circom";
// include "circomlib/circuits/eddsamimc.circom";
include "../../node_modules/circomlib/circuits/mimc.circom";
include "../../node_modules/circomlib/circuits/eddsamimc.circom";

template HashAndSignJson (max_json_size) {
    // json passed as an array of integers representing ascii characters
    // last (max_json_size - json_size) characters are just padding
    signal input json[max_json_size];
    // expectedHash included for testing. Note this must be passed as a string to match up
    signal input expected_hash;

    // signature parts
    signal input pubkey[2]; // Public 
    signal input signature_R8x;
    signal input signature_R8y;
    signal input signature_S;

    signal output json_hash;
    
    // hash json
    component hash = MultiMiMC7(max_json_size, 91); // 2nd parameter is number of rounds: 91 used in circomlibjs and circom unit tests
    hash.k <== 1; // k=1 used in frontend mimc hash
    for (var i=0; i<max_json_size; i++) {
        hash.in[i] <== json[i];
    }
    // assert expected hash -- the hash is used as the message to sign in the signature
    expected_hash === hash.out;

    // verify signature
    component signatureCheck = EdDSAMiMCVerifier();
    signatureCheck.enabled <== 1;
    signatureCheck.Ax <== pubkey[0];
    signatureCheck.Ay <== pubkey[1];
    signatureCheck.R8x <== signature_R8x;
    signatureCheck.R8y <== signature_R8y;
    signatureCheck.S <== signature_S;
    signatureCheck.M <== hash.out;

    json_hash <== hash.out;
}

// 14 powers of tau --> allows for 2**14 = 16384 constraints
// 19 powers of tau --> allows for 2**19 = 524288 constraints
// component main { public [ pubkey ] } = HashAndSignJson(25); // 14806 constraints
// component main { public [ pubkey ] } = HashAndSignJson(1000); // 369706 constraints
// component main { public [ pubkey ] } = HashAndSignJson(1400); // 515306 constraints

// Note it doesn't matter (at least in zkrepl) if arrays are arrays of strings of numbers or numbers
// i.e. {"test":[1,0]} same as {"test":["1", "0"]}
// Here is test input with max_json_size = 1400:
/* 
INPUT = {"json":[123,34,110,97,109,101,34,58,34,97,98,101,114,107,101,34,125,0,0,0,0,0,0,0,0],"expected_hash":"17714356765695238841646923571006253199580625922870994190188187434035240810052","pubkey":["1891156797631087029347893674931101305929404954783323547727418062433377377293","14780632341277755899330141855966417738975199657954509255716508264496764475094"],"signature_R8x":"16758573265488727828545935640943057777209470912840507105467798116374058104223","signature_R8y":"18392996603700776622368669993552828424883035969510766989506680336244288688829","signature_S":"2437348321815789502892027529529573936225726900639765107898121452273358163588"}
*/