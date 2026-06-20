// Cost items CRUD + session total computation.
// settled sessions block writes. discount amounts can be negative.
import { getDb } from '../db/connection.ts';
import { badRequest, notFound } from '../utils/http-error.ts';
import type { CreateCostItemInput, UpdateCostItemInput } from '../schemas/cost-item-schema.ts';
import type { CostItem, Session } from '../../shared/types.ts';

export function listCostItems(sessionId: number): CostItem[] {
  return getDb()
    .prepare('SELECT * FROM cost_items WHERE session_id = ? AND deleted_at IS NULL ORDER BY id ASC')
    .all(sessionId) as CostItem[];
}

export function getCostItem(id: number): CostItem {
  const row = getDb()
    .prepare('SELECT * FROM cost_items WHERE id = ? AND deleted_at IS NULL')
    .get(id) as CostItem | undefined;
  if (!row) throw notFound('Không tìm thấy khoản chi');
  return row;
}

export function createCostItem(sessionId: number, input: CreateCostItemInput): CostItem {
  const db = getDb();
  const session = db
    .prepare('SELECT status FROM sessions WHERE id = ? AND deleted_at IS NULL')
    .get(sessionId) as { status: string } | undefined;
  if (!session) throw notFound('Không tìm thấy buổi đánh');
  if (session.status === 'settled') throw badRequest('Buổi đã chốt. Mở lại trước khi thêm khoản chi.');

  const now = new Date().toISOString();
  const res = db
    .prepare(
      `INSERT INTO cost_items (session_id, type, label, amount, created_at)
       VALUES (@session_id, @type, @label, @amount, @now)`,
    )
    .run({ session_id: sessionId, type: input.type, label: input.label ?? null, amount: input.amount, now });
  return getCostItem(res.lastInsertRowid as number);
}

export function updateCostItem(id: number, input: UpdateCostItemInput): CostItem {
  const item = getCostItem(id);
  const db = getDb();
  const session = db
    .prepare('SELECT status FROM sessions WHERE id = ? AND deleted_at IS NULL')
    .get(item.session_id) as { status: string } | undefined;
  if (session?.status === 'settled') throw badRequest('Buổi đã chốt. Mở lại trước khi sửa khoản chi.');

  const sets: string[] = [];
  const params: Record<string, unknown> = { id };
  if (input.type !== undefined) { sets.push('type = @type'); params.type = input.type; }
  if (input.label !== undefined) { sets.push('label = @label'); params.label = input.label ?? null; }
  if (input.amount !== undefined) { sets.push('amount = @amount'); params.amount = input.amount; }

  if (sets.length) {
    db.prepare(`UPDATE cost_items SET ${sets.join(', ')} WHERE id = @id`).run(params);
  }
  return getCostItem(id);
}

export function deleteCostItem(id: number): void {
  const item = getCostItem(id);
  const db = getDb();
  const session = db
    .prepare('SELECT status FROM sessions WHERE id = ? AND deleted_at IS NULL')
    .get(item.session_id) as { status: string } | undefined;
  if (session?.status === 'settled') throw badRequest('Buổi đã chốt. Mở lại trước khi xóa khoản chi.');
  db.prepare('UPDATE cost_items SET deleted_at = ? WHERE id = ?').run(new Date().toISOString(), id);
}

// Tính tổng tiền buổi: manual_total ưu tiên; nếu không thì = sum(courts) + sum(cost_items).
export function computeSessionTotal(session: Session): number {
  if (session.manual_total !== null && session.manual_total !== undefined) {
    return session.manual_total;
  }
  const db = getDb();
  const courtsRow = db
    .prepare(
      'SELECT COALESCE(SUM(cost), 0) AS total FROM session_courts WHERE session_id = ? AND deleted_at IS NULL',
    )
    .get(session.id) as { total: number };
  const itemsRow = db
    .prepare(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM cost_items WHERE session_id = ? AND deleted_at IS NULL',
    )
    .get(session.id) as { total: number };
  return courtsRow.total + itemsRow.total;
}
