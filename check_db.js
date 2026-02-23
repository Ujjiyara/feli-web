const mongoose = require('mongoose');
const Registration = require('./backend/src/models/Registration');

mongoose.connect('mongodb://localhost:27017/felicity')
  .then(async () => {
    const reg = await Registration.findOne().sort({ createdAt: -1 });
    console.log("Latest Registration:", JSON.stringify(reg, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
