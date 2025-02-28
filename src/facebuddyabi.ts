export const facebuddyabi = [
  {
    type: "constructor",
    inputs: [
      { name: "_router", type: "address", internalType: "address payable" },
      { name: "_poolManager", type: "address", internalType: "address" },
      { name: "_permit2", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "approveTokenWithPermit2",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "amount", type: "uint160", internalType: "uint160" },
      { name: "expiration", type: "uint48", internalType: "uint48" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "permit2",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "contract IPermit2" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "poolManager",
    inputs: [],
    outputs: [
      { name: "", type: "address", internalType: "contract IPoolManager" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "router",
    inputs: [],
    outputs: [
      { name: "", type: "address", internalType: "contract UniversalRouter" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "swapExactInputSingle",
    inputs: [
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          { name: "currency0", type: "address", internalType: "Currency" },
          { name: "currency1", type: "address", internalType: "Currency" },
          { name: "fee", type: "uint24", internalType: "uint24" },
          { name: "tickSpacing", type: "int24", internalType: "int24" },
          { name: "hooks", type: "address", internalType: "contract IHooks" },
        ],
      },
      { name: "amountIn", type: "uint128", internalType: "uint128" },
      { name: "minAmountOut", type: "uint128", internalType: "uint128" },
      { name: "deadline", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;
