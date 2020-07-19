const sendToAllWindows = require('./send-to-all-windows');

// to keep workspace variables (meta) that
// are not saved to disk
// badge count, error, etc
const workspaceMetas = {};

const getWorkspaceMeta = (id) => workspaceMetas[id] || {};

const getWorkspaceMetas = () => workspaceMetas;

const setWorkspaceMeta = (id, options) => {
  // init
  workspaceMetas[id] = {
    ...workspaceMetas[id],
    ...options,
  };
  sendToAllWindows('set-workspace-meta', id, getWorkspaceMeta(id));
};

module.exports = {
  getWorkspaceMeta,
  getWorkspaceMetas,
  setWorkspaceMeta,
};
