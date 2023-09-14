enum ForgeTestExecutionArgument {
  GAS_LIMIT = 'gasLimit', // The block gas limit
  CODE_SIZE_LIMIT = 'codeSizeLimit', // EIP-170: Contract code size limit in bytes. Useful to increase this because of tests. By default, it is 0x6000 (~25kb)
  CHAIN_ID = 'chainId', // The chain ID
  GAS_PRICE = 'gasPrice', // The gas price
  BLOCK_BASE_FEE_PER_GAS = 'blockBaseFeePerGas', // The base fee in a block
  TX_ORIGIN = 'txOrigin', // The transaction origin
  BLOCK_COINBASE = 'blockCoinbase', // The coinbase of the block
  BLOCK_TIMESTAMP = 'blockTimestamp', // The timestamp of the block
  BLOCK_NUMBER = 'blockNumber', // The block number
  BLOCK_DIFFICULTY = 'blockDifficulty', // The block difficulty
  BLOCK_PREV_RANDAO = 'blockPrevRandao', // The block prevrandao value
  BLOCK_GAS_LIMIT = 'blockGasLimit', // The block gas limit
  MEMORY_LIMIT = 'memoryLimit', // The memory limit of the EVM in bytes (32 MB by default)
  ETHERSCAN_API_KEY = 'etherscanApiKey' // The Etherscan (or equivalent) API key
}

export default ForgeTestExecutionArgument;
