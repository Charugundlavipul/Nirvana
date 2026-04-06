
const { parseApprovalObject } = require('./src/lib/adminApi.js');
console.log('Testing object merge');
const existingPayload = { spaces: [{id: 1, name: 'space 1'}] };
const newPayload = { spaces: [] };
const merged = { ...existingPayload, ...newPayload };
console.log(JSON.stringify(merged));

