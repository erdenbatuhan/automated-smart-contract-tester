const express = require('express');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    // Replace the following promise with the service of your choice to easily verify that it works
    const healthCheckPromise = new Promise((resolve) => { resolve('Yey! Everything works as expected!'); });
    res.status(200).send((await healthCheckPromise));
  } catch ({ message }) {
    res.status(500).send(message);
  }
});

module.exports = router;
