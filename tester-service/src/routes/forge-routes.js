const express = require("express");
const router = express.Router();

/**
 * Returns the possible options for configuring the execution environment that can be used with the "forge test" command
 */
router.get("/test/options/executor-environment-config", async (req, res) => {
  res.status(200).json({
    "executorEnvironmentConfig": {
      "--gas-limit": "The block gas limit",
      "--code-size-limit": "EIP-170: Contract code size limit in bytes. Useful to increase this because of tests. By default, it is 0x6000 (~25kb)",
      "--chain-id": "The chain ID",
      "--gas-price": "The gas price",
      "--block-base-fee-per-gas": "The base fee in a block",
      "--tx-origin": "The transaction origin",
      "--block-coinbase": "The coinbase of the block",
      "--block-timestamp": "The timestamp of the block",
      "--block-number": "The block number",
      "--block-difficulty": "The block difficulty",
      "--block-prevrandao": "The block prevrandao value. NOTE: Before merge this field was mix_hash",
      "--block-gas-limit": "The block gas limit",
      "--memory-limit": "The memory limit of the EVM in bytes (32 MB by default)",
      "--etherscan-api-key": "The Etherscan (or equivalent) API key"      
    }
  })
});

module.exports = router;
