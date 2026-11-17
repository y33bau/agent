function invoke(action,update){const detail={action,update};document.dispatchEvent(new CustomEvent('companion-state',{detail}));if(detail.error)throw Error(detail.error);return detail.result;}
export const companion={read:()=>invoke('read'),commit:update=>invoke('commit',update)};
