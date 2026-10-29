-- V3.103.0：发货通知单补 ship_date 列（发货日期）。
-- 前端发货日期经 SHIPMENT_PC 落 shipments 表时，若未登记该列会被 parentCols 静默丢弃（返回 201 但值丢失）。
-- 此处加列并在 SHIPMENT_PC.parentCols 登记 ['ship_date','shipDate']，与采购申请 application_date 同款纪律。
ALTER TABLE shipments ADD COLUMN ship_date TEXT;
