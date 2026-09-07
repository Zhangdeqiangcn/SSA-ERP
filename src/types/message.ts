// 移动端即时消息（V2.80.0 W2）：真存云端 D1，多人共享、移动端轮询拉取。
export type MessageType = 'approval' | 'alert' | 'announce' | 'system';

export interface MobileMessage {
  id: string;
  org_id?: string;
  senderId?: string;
  senderName?: string;
  /** 指定接收用户 id；null 表示按角色或全员 */
  recipientId?: string | null;
  /** 接收角色（如 'admin'）；null 表示全员可见 */
  recipientRole?: string | null;
  title: string;
  body: string;
  type: MessageType;
  refModule?: string;
  refId?: string;
  /** 0 未读 / 1 已读 */
  read: number;
  readAt?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}
