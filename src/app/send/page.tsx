"use client";


import { useEffect, useState } from "react";

import ChatInterface from "src/components/ChatInterface";
import FaceRecognition from "src/components/FaceRecognition";
import FaceRegistration from "src/components/FaceRegistration";
import Footer from "src/components/Footer";
import { GetCIDResponse } from "pinata-web3";
import Image from "next/image";

import { ONCHAINKIT_LINK } from "src/links";
import OnchainkitSvg from "src/svg/OnchainkitSvg";
import { ProfileData } from "src/components/FaceRegistration";

import TransactionWrapper from "src/components/TransactionWrapper";
import WalletWrapper from "src/components/WalletWrapper";
import { getFileContent } from "src/utility/faceDataStorage";
import { useAccount } from "wagmi";


export default function Send() {

   const { address } = useAccount();
   const [activeView, setActiveView] = useState<"recognize" | "register">(
     "recognize"
   );
   const [savedFaces, setSavedFaces] = useState<
     Array<{
       label: ProfileData;
       descriptor: Float32Array;
     }>
   >([]);

   const handleFaceSaved = (
     newFaces: Array<{
       label: ProfileData;
       descriptor: any;
     }>
   ) => {
     setSavedFaces((prev) => [...prev, ...newFaces]);
   };

   useEffect(() => {
     async function populateFaces() {
       try {
         const content = await getFileContent(
           "bafkreia27z2wok67tk52sgxjytz4xvtbbho3sfty7qfkdvrr6miaunzwnm"
         );

         // Handle the fallback URL case
         if (typeof content === "string") {
           console.error("Failed to fetch face data");
           return;
         }

         // Handle JSON response
         if (
           content instanceof Object &&
           "data" in content &&
           typeof content.data === "object" &&
           content.data &&
           "content" in content.data
         ) {
           const jsonContent = content.data.content;
           if (typeof jsonContent !== "string") {
             console.error("Invalid content format");
             return;
           }

           const parsedContent = JSON.parse(jsonContent);
           // Convert the regular arrays back to Float32Array
           const processedFaces = parsedContent.map((face: any) => ({
             ...face,
             descriptor: new Float32Array(face.descriptor),
           }));

           setSavedFaces(processedFaces);
           console.log("faces downloaded");
         } else {
           console.error("Invalid response format");
         }
       } catch (error) {
         console.error("Error loading face data:", error);
       }
     }
     populateFaces();
   }, []);



  return (
    <FaceRecognition savedFaces={savedFaces} />
  );
}
