const matchOrg = (item, orgId) => !item.orgId || !orgId || item.orgId === orgId;
export {
  matchOrg as m
};
