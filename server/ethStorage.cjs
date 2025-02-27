require('dotenv').config({ path: '.env' });

const { FlatDirectory } = require("ethstorage-sdk");

const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
const rpc = "https://rpc.beta.testnet.l2.quarkchain.io:8545";


async function test()  {
    //const address = "0xA460C70b474cA4125c35dFaFfC1e83B0122efcaB"; // FlatDirectory address

    const flatDirectory = await FlatDirectory.create({
        rpc: rpc,
        privateKey: privateKey,
        // address: address,
    });

    await flatDirectory.deploy();
    console.log("flat directory successful")
    const request = {
        key: "test.txt",
        content: Buffer.from("big data"),
        type: 2, // 1 for calldata and 2 for blob
        callback: {
            onProgress(progress, count, isChange) {
            },
            onFail(err) {
            },
            onFinish(totalUploadChunks, totalUploadSize, totalStorageCost) {
            }
        }
    }
    await flatDirectory.upload(request);
    console.log("uploaded")
}
test();