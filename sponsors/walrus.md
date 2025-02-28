$6,000: Walrus Tusked Champion

We want to see a working project that compiles and builds without obvious errors with well-documented readmes. A successful project should have at least 2-3 major user flows that integrate with Walrus and anyone could execute these flows without encountering non-recoverable errors. Successful project teams would also account for internet disruptions and provide backup options for demos.

Explanation for why FaceBuddy satisfies the requirements:
FaceBuddy leverages Walrus's decentralized, efficient, and scalable storage to handle the large amounts of facial hash data generated during processing. This ensures reliable data availability and resilience, enabling seamless execution of user flows without errors that can scale to billions.

Code:
https://github.com/WilliamUW/facebuddy-web-app/blob/main/src/utility/walrus.ts

Face Storage:
https://github.com/WilliamUW/facebuddy-web-app/blob/faade49d336570d5f3198cdbec0d9d42ae66cac7/src/components/FaceRegistration.tsx#L132-L144

Face Retrieval:
https://github.com/WilliamUW/facebuddy-web-app/blob/72f78f23db06639094df4b59360dc9f856307141/src/app/page.tsx#L70-L85