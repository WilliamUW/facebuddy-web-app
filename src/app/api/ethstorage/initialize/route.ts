import { EthStorage, FlatDirectory } from 'ethstorage-sdk';

import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function GET() {
  console.log('API route hit: /api/ethstorage/initialize');
  
  try {
    const rpc = process.env.ETHSTORAGE_RPC_URL || "https://rpc.testnet.l2.quarkchain.io:8545";
    const ethStorageRpc = process.env.ETHSTORAGE_STORAGE_RPC_URL || "https://rpc.testnet.l2.ethstorage.io:9540";
    const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
    
    console.log('Config:', { rpc, ethStorageRpc, hasPrivateKey: !!privateKey });

    if (!privateKey) {
      return NextResponse.json(
        { error: 'Private key not configured' },
        { status: 500 }
      );
    }

    const ethStorage = await EthStorage.create({
      rpc: rpc,
      ethStorageRpc: ethStorageRpc,
      privateKey: privateKey,
  });

  console.log(ethStorage)

const contractAddress = ""
    return NextResponse.json({ 
      success: true, 
      contractAddress 
    });
  } catch (error) {
    console.error('Error initializing ETHStorage:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to initialize ETHStorage',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 