import { PinataSDK } from "pinata-web3";

const pinata = new PinataSDK({
  pinataJwt:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI0ZWM1OGNlZi1kNjkyLTQxYmQtOTQwNi03MTAyYzFmNzlhODkiLCJlbWFpbCI6ImJ3aWxsaWFtd2FuZ0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiN2U0YzU4MzRlZDQxODEyODQ3MDciLCJzY29wZWRLZXlTZWNyZXQiOiJlNjhlMjFmZTg2OTJjNDM5YTAzYWQ2M2EwN2M3Yzk5MjBhYTBiNzBmOGY1MTJjNzkxMGJjN2FlN2I5M2U1MzVmIiwiZXhwIjoxNzYxNTI1MjkxfQ._y-KYeA-G7n3AU-qUUbdlkGWz1v2k_5iDFQ9Powfh5I",
  pinataGateway: "brown-real-puma-604.mypinata.cloud",
});

export async function uploadToIPFS(jsonString: string) {
  const response = await fetch(`https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=1`, {
    method: "PUT",
    body: Buffer.from("hi"),
  })
  console.log(response)
}

export async function getFileContent(blobId: string) {
  try {
    console.log(blobId)
    if (blobId.length < 30) {
      throw Error;
    }
    const data = await pinata.gateways.get(blobId);
    console.log(data);
    return data;
  } catch (error) {
    console.log(error);
    return "https://brown-real-puma-604.mypinata.cloud/ipfs/bafkreiaasi3gb54wwg63v3n3l22gm3oycz3assy5w36ddtfgf2m36rzvam";
  }
}