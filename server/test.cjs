require('dotenv').config({ path: '.env' });
const { FlatDirectory, EthStorage } = require("ethstorage-sdk");

const rpc = "https://11155111.rpc.thirdweb.com";
const ethStorageRpc = "https://rpc.beta.testnet.l2.ethstorage.io:9596";
const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;

if (!privateKey) {
    console.error("Error: ETHSTORAGE_PRIVATE_KEY not found in environment variables");
    console.log("Please make sure you have set ETHSTORAGE_PRIVATE_KEY in .env.local file");
    process.exit(1);
}

async function main() {
    const flatDirectory = await FlatDirectory.create({
        rpc: rpc,
        privateKey: privateKey,
    });
    const contracAddress = await flatDirectory.deploy();
    console.log(`FlatDirectory address: ${contracAddress}.`);

    // const readData = await ethStorage.read(key);
    // console.log(readData)
}

const callback = {
    onProgress: function (progress, count, isChange) {
        console.log(`Uploaded ${progress} of ${count} chunks`);
    },
    onFail: function (err) {
        console.log(err);
    },
    onFinish: function (totalUploadChunks, totalUploadSize, totalStorageCost) {
        console.log(`Total upload chunk count is ${totalUploadChunks}, size is ${totalUploadSize}, storage cost is ${totalStorageCost}`);
    }
};

async function upload() {
    const address = "0xA460C70b474cA4125c35dFaFfC1e83B0122efcaB"; // FlatDirectory address

    const flatDirectory = await FlatDirectory.create({
        rpc: rpc,
        ethStorageRpc: ethStorageRpc,
        privateKey: privateKey,
        address: address,
    });
    console.log("flat directory successful")
    const request = {
        key: "test.txt",
        content: Buffer.from("big data"),
        type: 2, // 1 for calldata and 2 for blob
        callback: callback
    }
    await flatDirectory.upload(request);
    console.log("uploaded")
}

// main().catch(console.error);

upload().catch(error => {
    console.error("Error:", error);
    process.exit(1);
});