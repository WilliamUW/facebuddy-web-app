export async function issueCredentials(
  subject_address: string,
  claims: object
) {
  console.log(
    "Issuing Humanity Protocol Credentials...",
    subject_address,
    claims
  );
  const response = await fetch(
    "https://issuer.humanity.org/credentials/issue",
    {
      method: "POST",
      headers: {
        "X-API-Token": process.env.NEXT_PUBLIC_HUMANITY_API_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject_address,
        claims,
      }),
    }
  );

  const data = await response.json();
  console.log(data);
  return data;
}

export async function listCredentials(holderDid: string) {
  console.log("Listing Humanity Protocol Credentials...", holderDid);
  const response = await fetch(
    `https://issuer.humanity.org/credentials/list?holderDid=${holderDid}`,
    {
      method: "GET",
      headers: {
        "X-API-Token": process.env.NEXT_PUBLIC_HUMANITY_API_KEY as string,
      },
    }
  );

  const data = await response.json();
  console.log(data);
  return data;
}
