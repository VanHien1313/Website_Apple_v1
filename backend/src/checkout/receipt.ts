import { randomUUID } from 'node:crypto';
import { lockTransaction, type Database, type SqlClient } from '../db/database.ts';

export async function completeReceivedOrder(tx: SqlClient, id: string) {
 const result=await tx.query(`UPDATE orders SET status='COMPLETED',completed_at=SYSUTCDATETIME(),revision=revision+1 OUTPUT INSERTED.id WHERE id=@arg1 AND status='DELIVERED' AND payment_status='PAID' AND receipt_status IN ('CONFIRMED','AUTO')`,[id]);
 if(result.rows.length)await tx.query(`INSERT INTO order_events(id,order_id,actor_type,actor_name,kind,from_state,to_state,note) VALUES (@arg1,@arg2,'system',N'Hệ thống','status','DELIVERED','COMPLETED',N'Hoàn thành: đã ghi nhận thanh toán và xác nhận nhận hàng.')`,[randomUUID(),id]);
}
export async function confirmOverdueReceipts(db: Database) {
 const rows=(await db.query<{id:string}>(`SELECT TOP (100) id FROM orders WHERE status='DELIVERED' AND receipt_status='WAITING' AND delivered_at<=DATEADD(day,-7,SYSUTCDATETIME()) ORDER BY delivered_at,id`)).rows;
 let count=0;
 for(const {id} of rows)count+=await db.transaction(async tx=>{
  await lockTransaction(tx,`order:${id.toLowerCase()}`);
  const result=await tx.query(`UPDATE orders SET receipt_status='AUTO',receipt_confirmed_at=SYSUTCDATETIME(),revision=revision+1 OUTPUT INSERTED.id WHERE id=@arg1 AND status='DELIVERED' AND receipt_status='WAITING' AND delivered_at<=DATEADD(day,-7,SYSUTCDATETIME())`,[id]);
  if(!result.rows.length)return 0;
  await tx.query(`INSERT INTO order_events(id,order_id,actor_type,actor_name,kind,from_state,to_state,note) VALUES (@arg1,@arg2,'system',N'Hệ thống','status','DELIVERED','DELIVERED',N'Tự xác nhận nhận hàng sau 7 ngày không có phản hồi. Không xác nhận thu tiền COD.')`,[randomUUID(),id]);
  await completeReceivedOrder(tx,id);return 1;
 });
 return count;
}
