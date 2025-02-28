const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";

export async function readFromBlobId(blobId: string) {
  try {
    console.log("Walrus Read from: " + blobId);
    // Make the API call to read from the blobId
    const response = await fetch(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`, {
      method: "GET",
    });

    // Check if the response is ok (status code in the range 200-299)
    if (!response.ok) {
      throw new Error(`Failed to retrieve data: ${response.statusText}`);
    }

    // Assuming the response returns a blob or JSON content
    const result = await response.text(); // or response.text() depending on the content type
    console.log("Data from Blob:", result);
    return result;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

export async function storeStringAndGetBlobId(data: string) {
  if (!process.env.NEXT_PUBLIC_WALRUS_ENABLED) {
    return null;
  }
  try {
    console.log("store walrus start: ", data);
    // Make the API call to store the string
    const response = await fetch(
      `https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=5`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "text/plain",
        },
        body: data,
      }
    );

    // Check if the response is ok (status code in the range 200-299)
    if (!response.ok) {
      throw new Error(`Failed to store data: ${response.statusText}`);
    }

    // Parse the response to get the blob id
    const result = await response.json();
    console.log(result);

    let blobId: string | null = null;

    // Check for "alreadyCertified" or "newlyCreated" in the response and extract blobId
    if (result.alreadyCertified && result.alreadyCertified.blobId) {
      blobId = result.alreadyCertified.blobId;
    } else if (
      result.newlyCreated &&
      result.newlyCreated.blobObject &&
      result.newlyCreated.blobObject.blobId
    ) {
      blobId = result.newlyCreated.blobObject.blobId;
    }

    if (blobId) {
      console.log("Blob ID:", blobId);
      return blobId;
    } else {
      throw new Error("Blob ID not found in response.");
    }
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}
