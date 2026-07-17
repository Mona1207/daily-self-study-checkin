export const getNotificationPermission = (): NotificationPermission | "unsupported" => {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission | "unsupported"> => {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.requestPermission();
};

export const describeNotificationPermission = (status: NotificationPermission | "unsupported"): string => {
  if (status === "granted") return "已开启";
  if (status === "denied") return "已拒绝，请在系统或浏览器设置中开启";
  if (status === "default") return "尚未授权";
  return "当前环境不支持系统通知";
};
