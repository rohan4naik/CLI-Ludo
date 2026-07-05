#!/usr/bin/env node
'use strict';

const { main } = require('../src/cli');

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
