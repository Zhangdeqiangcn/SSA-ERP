// 序列号流转记录（serial_movements）写入辅助
// 序列号主档 serial_masters 的流转轨迹（入库/出库/调拨/退货等）需落 serial_movements，
// 否则去掉 Blob 后历史轨迹会丢失。此处集中实现插入逻辑，供 index/[:id] 复用。
// 注：与 functions/_shared/auth.ts 保持一致，DB 用 any（Cloudflare Workers 运行时注入，本地不依赖 @cloudflare/workers-types）。

export interface SerialMovementInput {
  type?: string | null;
  docNo?: string | null;
  date?: string | null;
  status?: string | null;
  note?: string | null;
}

export async function insertSerialMovement(
  db: any,
  serialMasterId: string,
  m: SerialMovementInput,
  user: { name?: string },
  now: string
): Promise<void> {
  const mid = 'smv-' + crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO serial_movements (id, serial_master_id, type, doc_no, date, status, note, created_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      mid,
      serialMasterId,
      m.type || null,
      m.docNo || null,
      m.date || now,
      m.status || null,
      m.note || null,
      now,
      user.name || 'system'
    )
    .run();
}
