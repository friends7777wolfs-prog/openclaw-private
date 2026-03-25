const PQueue = require('p-queue').default;

// מקסימום 3 קריאות במקביל ל-Claude
const queue = new PQueue({ concurrency: 3 });

function enqueue(fn) {
  return queue.add(fn);
}

function getStats() {
  return { size: queue.size, pending: queue.pending };
}

module.exports = { enqueue, getStats };
