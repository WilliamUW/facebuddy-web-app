
export async function issueCredentials(userAddress: string, claims: object) {
    console.log("Issuing Humanity Protocol Credentials...", userAddress, claims)
    const response = await fetch(
    "https://issuer.humanity.org/credentials/issue",
    {
      method: "POST",
      headers: {
        "X-API-Token": process.env.NEXT_PUBLIC_HUMANITY_API_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject_address: "0x0fa4adf7830a048c285e981ba5d57c51604c917f",
        claims: {
          kyc: "passed",
          age: 22,
          custom_claim: "value",
        },
      }),
    }
  );

  const data = await response.json();
  console.log(data)
  return data
}
