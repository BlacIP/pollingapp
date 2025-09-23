const KEY = "pollingapp_polls_react_v1";

export const loadPolls = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
};
export const savePolls = (polls) => localStorage.setItem(KEY, JSON.stringify(polls));