export const POLL_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled', 
  ARCHIVED: 'archived',
  DELETED: 'deleted'
};

export const STATUS_LABELS = {
  [POLL_STATUS.ACTIVE]: 'Active',
  [POLL_STATUS.DISABLED]: 'Disabled',
  [POLL_STATUS.ARCHIVED]: 'Archived',
  [POLL_STATUS.DELETED]: 'Deleted'
};

export const STATUS_COLORS = {
  [POLL_STATUS.ACTIVE]: 'bg-green-500 text-white',
  [POLL_STATUS.DISABLED]: 'bg-yellow-500 text-white',
  [POLL_STATUS.ARCHIVED]: 'bg-gray-500 text-white',
  [POLL_STATUS.DELETED]: 'bg-red-500 text-white'
};

export const getAvailableActions = (status) => {
  switch (status) {
    case POLL_STATUS.ACTIVE:
      return ['disable', 'archive', 'delete'];
    case POLL_STATUS.DISABLED:
      return ['activate', 'archive', 'delete'];
    case POLL_STATUS.ARCHIVED:
      return ['activate', 'delete'];
    case POLL_STATUS.DELETED:
      return ['restore', 'archive', 'permanent_delete'];
    default:
      return [];
  }
};

export const getActionLabel = (action) => {
  const labels = {
    activate: 'Activate',
    disable: 'Disable',
    archive: 'Archive',
    delete: 'Move to Trash',
    restore: 'Restore',
    permanent_delete: 'Delete Permanently'
  };
  return labels[action] || action;
};

export const isDeletedRecently = (deletedAt) => {
  if (!deletedAt) return false;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return new Date(deletedAt) > thirtyDaysAgo;
};