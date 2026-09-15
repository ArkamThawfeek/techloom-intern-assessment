require('dotenv').config();
const app = require('./src/app');
const { startExpiryWorker } = require('./src/jobs/expireReservations.job');

const PORT = process.env.PORT || 4000;

startExpiryWorker();

app.listen(PORT, () => {
  console.log(`POS backend listening on port ${PORT}`);
});
